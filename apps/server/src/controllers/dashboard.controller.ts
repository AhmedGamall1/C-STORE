import type { Request, Response } from 'express'
import * as dashboardService from '../services/dashboard.service.js'

// GET /api/dashboard
export const getDashboardStats = async (req: Request, res: Response) => {
  const data = await dashboardService.getDashboardStats(
    req.user?.role === 'ADMIN'
  )
  res.json({ status: 'success', data })
}
