export type ReservationLine = {
  line_id?: string
  reservation_id: string
  car_id: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  pickup_location: string
  dropoff_location: string
  rental_price: number
  status: string
  driver_first_name?: string
  driver_last_name?: string
  driver_birthday?: string
  driver_phone?: string
  driver_email?: string
  driver_gov_id_url?: string
  driver_license_url?: string
  driver_is_renter?: boolean
  car?: {
    car_id: string
    brand: string
    model: string
    year: number
    plate_number?: string
    rate_per_day: number
    image: string | null
  }
}

export type Reservation = {
  reservation_id: string
  user_id: string
  reference_code: string
  status: string
  subtotal: number
  fees: number
  total: number
  renter_first_name?: string
  renter_last_name?: string
  renter_birthday?: string
  renter_email?: string
  renter_phone?: string
  renter_gov_id_url?: string
  renter_license_url?: string
  notes?: string | null
  created_at: string
  reservation_lines: ReservationLine[]
  user?: {
    first_name: string
    last_name: string
    email: string
    phone_number?: string
  }
}
