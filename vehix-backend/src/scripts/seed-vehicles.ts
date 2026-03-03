import dotenv from 'dotenv';
dotenv.config();

import supabase from '../lib/supabase';

async function seed() {
  const vehicles = [
    {
      brand: 'Toyota',
      model: 'Vios',
      year: 2022,
      plate_number: 'ABC 1234',
      capacity: 5,
      transmission: 'automatic',
      fuel_type: 'gasoline',
      rate_per_day: 1500,
      status: 'available',
      current_millage: 15000,
    },
    {
      brand: 'Mitsubishi',
      model: 'Montero Sport',
      year: 2023,
      plate_number: 'XYZ 5678',
      capacity: 7,
      transmission: 'automatic',
      fuel_type: 'diesel',
      rate_per_day: 3500,
      status: 'available',
      current_millage: 8000,
    },
    {
      brand: 'Toyota',
      model: 'HiAce',
      year: 2021,
      plate_number: 'DEF 9012',
      capacity: 12,
      transmission: 'manual',
      fuel_type: 'diesel',
      rate_per_day: 5000,
      status: 'maintenance',
      current_millage: 45000,
    },
  ];

  const { data, error } = await supabase
    .from('car')
    .insert(vehicles)
    .select('*');

  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }

  console.log('Seeded vehicles:');
  console.log(JSON.stringify(data, null, 2));
}

seed();
