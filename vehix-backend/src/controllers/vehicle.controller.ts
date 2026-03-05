import { Request, Response } from 'express';
import supabase from '../lib/supabase';

export async function getAllVehicles(req: Request, res: Response): Promise<void> {
  const { status, type } = req.query;

  let query = supabase.from('car').select('*');

  if (status) {
    query = query.eq('status', status as string);
  }

  if (type) {
    query = query.eq('type', type as string);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles.', detail: error.message });
    return;
  }

  res.json({ vehicles: data });
}

export async function getVehicleById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('car')
    .select('*')
    .eq('car_id', id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Vehicle not found.' });
    return;
  }

  res.json({ vehicle: data });
}

export async function createVehicle(req: Request, res: Response): Promise<void> {
  const {
    model,
    brand,
    year,
    plate_number,
    capacity,
    transmission,
    fuel_type,
    rate_per_day,
    status,
    current_millage,
    image,
  } = req.body;

  if (!model || !brand || !year || !plate_number || !rate_per_day) {
    res.status(400).json({ error: 'model, brand, year, plate_number, and rate_per_day are required.' });
    return;
  }

  const { data, error } = await supabase
    .from('car')
    .insert({
      model,
      brand,
      year,
      plate_number,
      capacity: capacity ?? null,
      transmission: transmission ?? null,
      fuel_type: fuel_type ?? null,
      rate_per_day,
      status: status ?? 'available',
      current_millage: current_millage ?? null,
      image: image ?? null,
    })
    .select('*')
    .single();

  if (error) {
    res.status(500).json({ error: 'Failed to create vehicle.', detail: error.message });
    return;
  }

  res.status(201).json({ vehicle: data });
}

export async function updateVehicle(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    model,
    brand,
    year,
    plate_number,
    capacity,
    transmission,
    fuel_type,
    rate_per_day,
    status,
    current_millage,
    image,
  } = req.body;

  const { data, error } = await supabase
    .from('car')
    .update({
      model,
      brand,
      year,
      plate_number,
      capacity,
      transmission,
      fuel_type,
      rate_per_day,
      status,
      current_millage,
      image,
    })
    .eq('car_id', id)
    .select('*')
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Vehicle not found or update failed.', detail: error?.message });
    return;
  }

  res.json({ vehicle: data });
}

export async function updateVehicleStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['available', 'rented', 'maintenance'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}.` });
    return;
  }

  const { data, error } = await supabase
    .from('car')
    .update({ status })
    .eq('car_id', id)
    .select('*')
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Vehicle not found or status update failed.', detail: error?.message });
    return;
  }

  res.json({ vehicle: data });
}

export async function deleteVehicle(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Check vehicle exists
  const { data: car, error: carError } = await supabase
    .from('car')
    .select('car_id')
    .eq('car_id', id)
    .single();

  if (carError || !car) {
    res.status(404).json({ error: 'Vehicle not found.' });
    return;
  }

  // Check for active reservations in reservation_lines
  const { data: activeLines, error: linesError } = await supabase
    .from('reservation_lines')
    .select('car_id')
    .eq('car_id', id)
    .in('status', ['pending', 'approved']);

  if (linesError) {
    res.status(500).json({ error: 'Failed to check active reservations.', detail: linesError.message });
    return;
  }

  if (activeLines && activeLines.length > 0) {
    res.status(400).json({
      error: 'Cannot delete vehicle with active reservations. Please resolve all pending or approved bookings first.',
    });
    return;
  }

  // Safe to delete
  const { error: deleteError } = await supabase
    .from('car')
    .delete()
    .eq('car_id', id);

  if (deleteError) {
    res.status(500).json({ error: 'Failed to delete vehicle.', detail: deleteError.message });
    return;
  }

  res.status(200).json({ message: 'Vehicle deleted successfully.' });
}
