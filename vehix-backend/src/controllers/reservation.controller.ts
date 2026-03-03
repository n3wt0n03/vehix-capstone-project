import { Request, Response } from 'express';
import supabase from '../lib/supabase';
import { generateReferenceCode } from '../utils/reference';

export async function createReservation(req: Request, res: Response): Promise<void> {
  const { car_id, start_date, end_date, pickup_location, dropoff_location } = req.body;

  if (!car_id || !start_date || !end_date || !pickup_location || !dropoff_location) {
    res.status(400).json({
      error: 'car_id, start_date, end_date, pickup_location, and dropoff_location are required.',
    });
    return;
  }

  const customer_id = req.user!.user_id;

  // Fetch vehicle to get rate_per_day and current status
  const { data: car, error: carError } = await supabase
    .from('car')
    .select('car_id, rate_per_day, status')
    .eq('car_id', car_id)
    .single();

  if (carError || !car) {
    res.status(404).json({ error: 'Vehicle not found.' });
    return;
  }

  if (car.status !== 'available') {
    res.status(409).json({ error: 'Vehicle is not available for booking.' });
    return;
  }

  // Check for overlapping approved reservations
  const { data: overlap, error: overlapError } = await supabase
    .from('reservations')
    .select('reservation_id')
    .eq('car_id', car_id)
    .eq('status', 'approved')
    .lt('start_date', end_date)
    .gt('end_date', start_date);

  if (overlapError) {
    res.status(500).json({ error: 'Failed to check vehicle availability.', detail: overlapError.message });
    return;
  }

  if (overlap && overlap.length > 0) {
    res.status(409).json({ error: 'Vehicle is already booked for the selected dates.' });
    return;
  }

  // Calculate rental price
  const start = new Date(start_date);
  const end = new Date(end_date);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    res.status(400).json({ error: 'end_date must be after start_date.' });
    return;
  }

  const rental_price = car.rate_per_day * days;
  const reference_code = generateReferenceCode();

  const { data: reservation, error: insertError } = await supabase
    .from('reservations')
    .insert({
      user_id: customer_id,
      car_id,
      start_date,
      end_date,
      pickup_location,
      dropoff_location,
      rental_price,
      reference_code,
      status: 'pending',
    })
    .select('*')
    .single();

  if (insertError) {
    res.status(500).json({ error: 'Failed to create reservation.', detail: insertError.message });
    return;
  }

  res.status(201).json({ reservation });
}

export async function getMyReservations(req: Request, res: Response): Promise<void> {
  const customer_id = req.user!.user_id;

  const { data, error } = await supabase
    .from('reservations')
    .select('*, car(*)')
    .eq('user_id', customer_id)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Failed to fetch reservations.', detail: error.message });
    return;
  }

  res.json({ reservations: data });
}

export async function getAllReservations(req: Request, res: Response): Promise<void> {
  const { status } = req.query;

  let query = supabase
    .from('reservations')
    .select('*, car(*), users(*)')
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

export async function getReservationById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { user_id, role_name } = req.user!;

  const { data, error } = await supabase
    .from('reservations')
    .select('*, car(*), users(*)')
    .eq('reservation_id', id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Reservation not found.' });
    return;
  }

  // Customers can only view their own reservations
  if (role_name === 'customer' && data.user_id !== user_id) {
    res.status(403).json({ error: 'Forbidden: you can only view your own reservations.' });
    return;
  }

  res.json({ reservation: data });
}

export async function updateReservationStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['approved', 'rejected', 'completed', 'under_review'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}.` });
    return;
  }

  // Fetch reservation to get car_id
  const { data: existing, error: fetchError } = await supabase
    .from('reservations')
    .select('reservation_id, car_id')
    .eq('reservation_id', id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Reservation not found.' });
    return;
  }

  // Update reservation status
  const { data: reservation, error: updateError } = await supabase
    .from('reservations')
    .update({ status })
    .eq('reservation_id', id)
    .select('*')
    .single();

  if (updateError) {
    res.status(500).json({ error: 'Failed to update reservation status.', detail: updateError.message });
    return;
  }

  // Sync car status based on reservation outcome
  let carStatus: string | null = null;
  if (status === 'approved') carStatus = 'rented';
  if (status === 'rejected' || status === 'completed') carStatus = 'available';

  if (carStatus) {
    await supabase
      .from('car')
      .update({ status: carStatus })
      .eq('car_id', existing.car_id);
  }

  res.json({ reservation });
}
