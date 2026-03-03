export type Vehicle = {
  car_id: string
  brand: string
  model: string
  year: number
  plate_number: string
  capacity: number
  transmission: string
  fuel_type: string
  rate_per_day: number
  status: 'available' | 'rented' | 'maintenance'
  current_millage: number
  image: string | null
  description: string | null
  created_at: string
}
