export type Reservation = {
  reservation_id: string
  user_id: string
  car_id: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  rental_price: number
  status: string
  pickup_location: string
  dropoff_location: string
  reference_code: string
  is_reservation_fee_paid: boolean
  voucher_discount_applied: number
  created_at: string
  car?: {
    brand: string
    model: string
    year: number
    plate_number?: string
    rate_per_day: number
    image: string | null
  }
  user?: {
    first_name: string
    last_name: string
    email: string
    phone_number?: string
  }
}
