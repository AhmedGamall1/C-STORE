import type { Request, Response } from 'express'
import * as dashboardService from '../services/dashboard.service.js'

// GET /api/dashboard
export const getDashboardStats = async (_req: Request, res: Response) => {
  const data = await dashboardService.getDashboardStats()
  res.json({ status: 'success', data })
}
