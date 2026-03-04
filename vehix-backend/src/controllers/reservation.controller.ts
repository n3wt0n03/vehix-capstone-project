import { Request, Response } from 'express';
import supabase from '../lib/supabase';
import { generateReferenceCode } from '../utils/reference';

// ─── POST /api/reservations ───────────────────────────────────────────────────
export async function createReservation(req: Request, res: Response): Promise<void> {
  const {
    renter_first_name,
    renter_last_name,
    renter_birthday,
    renter_email,
    renter_phone,
    renter_gov_id_url,
    renter_license_url,
    notes,
    lines,
  } = req.body;

  // Validate renter fields
  if (
    !renter_first_name || !renter_last_name || !renter_birthday ||
    !renter_email || !renter_phone ||
    !renter_gov_id_url || !renter_license_url
  ) {
    res.status(400).json({
      error: 'renter_first_name, renter_last_name, renter_birthday, renter_email, renter_phone, renter_gov_id_url, and renter_license_url are required.',
    });
    return;
  }

  // Validate lines array
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: 'lines must be a non-empty array of vehicle bookings.' });
    return;
  }

  const requiredLineFields = [
    'car_id', 'start_date', 'start_time', 'end_date', 'end_time',
    'pickup_location', 'dropoff_location',
    'driver_first_name', 'driver_last_name', 'driver_birthday',
    'driver_phone', 'driver_email',
    'driver_gov_id_url', 'driver_license_url',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const missing = requiredLineFields.filter((f) => !line[f]);
    if (missing.length > 0) {
      res.status(400).json({ error: `lines[${i}] is missing: ${missing.join(', ')}.` });
      return;
    }
  }

  const user_id = req.user!.user_id;

  // ── Validate each car and check availability ──────────────────────────────
  type EnrichedLine = (typeof lines)[0] & { rental_price: number };
  const enrichedLines: EnrichedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const { car_id, start_date, end_date } = line;

    // Check car exists and is available
    const { data: car, error: carError } = await supabase
      .from('car')
      .select('car_id, rate_per_day, status')
      .eq('car_id', car_id)
      .single();

    if (carError || !car) {
      res.status(404).json({ error: `lines[${i}]: car_id "${car_id}" not found.` });
      return;
    }

    if (car.status !== 'available') {
      res.status(409).json({ error: `lines[${i}]: car "${car_id}" is not available for booking.` });
      return;
    }

    // Check for overlapping approved or pending reservations in reservation_lines
    const { data: overlap, error: overlapError } = await supabase
      .from('reservation_lines')
      .select('car_id')
      .eq('car_id', car_id)
      .in('status', ['approved', 'pending'])
      .lt('start_date', end_date)
      .gt('end_date', start_date);

    if (overlapError) {
      res.status(500).json({ error: `lines[${i}]: failed to check availability.`, detail: overlapError.message });
      return;
    }

    if (overlap && overlap.length > 0) {
      res.status(409).json({ error: `lines[${i}]: car "${car_id}" is already booked for the selected dates.` });
      return;
    }

    // Calculate rental price
    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      res.status(400).json({ error: `lines[${i}]: end_date must be after start_date.` });
      return;
    }

    enrichedLines.push({ ...line, rental_price: car.rate_per_day * days });
  }

  // ── Calculate totals ──────────────────────────────────────────────────────
  const subtotal = enrichedLines.reduce((sum, l) => sum + l.rental_price, 0);
  const fees = 0;
  const total = subtotal + fees;
  const reference_code = generateReferenceCode();

  // ── Insert reservation header ─────────────────────────────────────────────
  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .insert({
      user_id,
      reference_code,
      status: 'pending',
      subtotal,
      fees,
      total,
      renter_first_name,
      renter_last_name,
      renter_birthday,
      renter_email,
      renter_phone,
      renter_gov_id_url,
      renter_license_url,
      notes: notes ?? null,
    })
    .select('*')
    .single();

  if (reservationError || !reservation) {
    res.status(500).json({ error: 'Failed to create reservation.', detail: reservationError?.message });
    return;
  }

  // ── Insert reservation lines ──────────────────────────────────────────────
  const lineRows = enrichedLines.map((line) => ({
    reservation_id: reservation.reservation_id,
    car_id: line.car_id,
    start_date: line.start_date,
    start_time: line.start_time,
    end_date: line.end_date,
    end_time: line.end_time,
    pickup_location: line.pickup_location,
    dropoff_location: line.dropoff_location,
    rental_price: line.rental_price,
    status: 'pending',
    driver_first_name: line.driver_first_name,
    driver_last_name: line.driver_last_name,
    driver_birthday: line.driver_birthday,
    driver_phone: line.driver_phone,
    driver_email: line.driver_email,
    driver_gov_id_url: line.driver_gov_id_url,
    driver_license_url: line.driver_license_url,
    driver_is_renter: line.driver_is_renter ?? false,
  }));

  const { data: insertedLines, error: linesError } = await supabase
    .from('reservation_lines')
    .insert(lineRows)
    .select('*');

  if (linesError) {
    // Roll back the reservation header
    await supabase.from('reservations').delete().eq('reservation_id', reservation.reservation_id);
    res.status(500).json({ error: 'Failed to create reservation lines.', detail: linesError.message });
    return;
  }

  res.status(201).json({ reservation: { ...reservation, lines: insertedLines } });
}

// ─── GET /api/reservations/my ─────────────────────────────────────────────────
export async function getMyReservations(req: Request, res: Response): Promise<void> {
  const user_id = req.user!.user_id;

  const { data, error } = await supabase
    .from('reservations')
    .select('*, reservation_lines(*, car(*))')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Failed to fetch reservations.', detail: error.message });
    return;
  }

  res.json({ reservations: data });
}

// ─── GET /api/reservations ────────────────────────────────────────────────────
export async function getAllReservations(req: Request, res: Response): Promise<void> {
  const { status } = req.query;

  let query = supabase
    .from('reservations')
    .select('*, users(*), reservation_lines(*, car(*))')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status as string);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: 'Failed to fetch reservations.', detail: error.message });
    return;
  }

  res.json({ reservations: data });
}

// ─── GET /api/reservations/:id ────────────────────────────────────────────────
export async function getReservationById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { user_id, role_name } = req.user!;

  const { data, error } = await supabase
    .from('reservations')
    .select('*, users(*), reservation_lines(*, car(*))')
    .eq('reservation_id', id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Reservation not found.' });
    return;
  }

  if (role_name === 'customer' && data.user_id !== user_id) {
    res.status(403).json({ error: 'Forbidden: you can only view your own reservations.' });
    return;
  }

  res.json({ reservation: data });
}

// ─── PATCH /api/reservations/:id/status ──────────────────────────────────────
export async function updateReservationStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['approved', 'rejected', 'completed', 'under_review'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}.` });
    return;
  }

  // Fetch reservation lines to get all car_ids
  const { data: existing, error: fetchError } = await supabase
    .from('reservations')
    .select('reservation_id, reservation_lines(car_id)')
    .eq('reservation_id', id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Reservation not found.' });
    return;
  }

  // Update reservation header status
  const { data: reservation, error: reservationUpdateError } = await supabase
    .from('reservations')
    .update({ status })
    .eq('reservation_id', id)
    .select('*')
    .single();

  if (reservationUpdateError) {
    res.status(500).json({ error: 'Failed to update reservation status.', detail: reservationUpdateError.message });
    return;
  }

  // Update all reservation_lines status
  const { error: linesUpdateError } = await supabase
    .from('reservation_lines')
    .update({ status })
    .eq('reservation_id', id);

  if (linesUpdateError) {
    res.status(500).json({ error: 'Failed to update reservation line statuses.', detail: linesUpdateError.message });
    return;
  }

  // Sync car statuses
  const lines = (existing.reservation_lines as { car_id: string }[]) ?? [];
  const carIds = lines.map((l) => l.car_id);

  if (carIds.length > 0) {
    let carStatus: string | null = null;
    if (status === 'approved') carStatus = 'rented';
    if (status === 'rejected' || status === 'completed') carStatus = 'available';

    if (carStatus) {
      await supabase
        .from('car')
        .update({ status: carStatus })
        .in('car_id', carIds);
    }
  }

  res.json({ reservation });
}

// ─── GET /api/reservations/availability ──────────────────────────────────────
export async function checkAvailability(req: Request, res: Response): Promise<void> {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    res.status(400).json({ error: 'start_date and end_date query params are required.' });
    return;
  }

  // Find car_ids that have overlapping approved or pending lines
  const { data: blockedLines, error: blockedError } = await supabase
    .from('reservation_lines')
    .select('car_id')
    .in('status', ['approved', 'pending'])
    .lt('start_date', end_date as string)
    .gt('end_date', start_date as string);

  if (blockedError) {
    res.status(500).json({ error: 'Failed to check availability.', detail: blockedError.message });
    return;
  }

  const blockedCarIds = [...new Set((blockedLines ?? []).map((l) => l.car_id))];

  // Fetch all available cars not in the blocked set
  let query = supabase
    .from('car')
    .select('*')
    .eq('status', 'available');

  if (blockedCarIds.length > 0) {
    query = query.not('car_id', 'in', `(${blockedCarIds.join(',')})`);
  }

  const { data: cars, error: carsError } = await query;

  if (carsError) {
    res.status(500).json({ error: 'Failed to fetch available vehicles.', detail: carsError.message });
    return;
  }

  res.json({ available_cars: cars });
}
