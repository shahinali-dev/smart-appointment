import { Router } from "express";
import httpStatus from "http-status";
import { isAuth } from "../../middleware/is_auth";
import catchAsync from "../../utils/catch_async.utils";
import sendResponse from "../../utils/send_response.utils";
import { dashboardService } from "./dashboard.service";

const router = Router();

// All routes require authentication
router.use(isAuth);

// Get complete dashboard data
router.get(
  "/",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const dashboardData = await dashboardService.getDashboardData(createdBy);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Dashboard data fetched successfully",
      data: dashboardData,
    });
  }),
);

// Get dashboard statistics only
router.get(
  "/stats",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const stats = await dashboardService.getDashboardStats(createdBy);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Dashboard statistics fetched successfully",
      data: stats,
    });
  }),
);

// Get staff load summary
router.get(
  "/staff-load",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const staffLoad = await dashboardService.getStaffLoadSummary(createdBy);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Staff load summary fetched successfully",
      data: staffLoad,
    });
  }),
);

// Get upcoming appointments
router.get(
  "/upcoming-appointments",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const appointments =
      await dashboardService.getUpcomingAppointments(createdBy);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Upcoming appointments fetched successfully",
      data: appointments,
    });
  }),
);

// Get appointments overview by status
router.get(
  "/appointments-overview",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const overview = await dashboardService.getAppointmentsOverview(createdBy);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointments overview fetched successfully",
      data: overview,
    });
  }),
);

// Get staff performance
router.get(
  "/staff-performance",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const performance = await dashboardService.getStaffPerformance(createdBy);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Staff performance fetched successfully",
      data: performance,
    });
  }),
);

export const dashboardRoute = router;
