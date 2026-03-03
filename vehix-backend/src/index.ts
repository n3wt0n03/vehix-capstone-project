import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { supabase } from './lib/supabase'
import authRoutes from './routes/auth.routes'
import vehicleRoutes from './routes/vehicle.routes'
import reservationRoutes from './routes/reservation.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check + DB test
app.get('/api/health', async (req, res) => {
  const { data, error } = await supabase.from('user_roles').select('*')
  if (error) {
    return res.status(500).json({ status: 'DB connection failed', error: error.message })
  }
  res.json({ status: 'Vehix backend is running 🚗', roles: data })
})

app.use('/api/auth', authRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/reservations', reservationRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app