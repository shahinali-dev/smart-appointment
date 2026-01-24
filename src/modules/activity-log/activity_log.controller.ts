import { Router } from "express";
import httpStatus from "http-status";
import { isAuth } from "../../middleware/is_auth";
import catchAsync from "../../utils/catch_async.utils";
import sendResponse from "../../utils/send_response.utils";
import { ActivityLogType } from "./activity_log.enum";
import { activityLogService } from "./activity_log.service";

const router = Router();

// All routes require authentication
router.use(isAuth);

// Get all activity logs with pagination
router.get(
  "/",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const result = await activityLogService.getAllLogs(createdBy, req.query);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Activity logs fetched successfully",
      meta: result.meta,
      data: result.result,
    });
  }),
);

// Get recent logs (latest 5-10)
router.get(
  "/recent",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const logs = await activityLogService.getRecentLogs(createdBy, limit);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Recent activity logs fetched successfully",
      data: logs,
    });
  }),
);

// Get logs by appointment
router.get(
  "/appointment/:appointmentId",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { appointmentId } = req.params;
    const logs = await activityLogService.getLogsByAppointment(
      createdBy,
      appointmentId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Activity logs fetched successfully",
      data: logs,
    });
  }),
);

// Get logs by staff
router.get(
  "/staff/:staffId",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { staffId } = req.params;
    const logs = await activityLogService.getLogsByStaff(createdBy, staffId);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Activity logs fetched successfully",
      data: logs,
    });
  }),
);

// Get logs by type
router.get(
  "/type/:type",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { type } = req.params;

    // Validate type
    if (!Object.values(ActivityLogType).includes(type as ActivityLogType)) {
      return sendResponse(res, {
        success: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: "Invalid activity log type",
        data: null,
      });
    }

    const logs = await activityLogService.getLogsByType(
      createdBy,
      type as ActivityLogType,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Activity logs fetched successfully",
      data: logs,
    });
  }),
);

// Get logs by date range
router.get(
  "/date-range",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return sendResponse(res, {
        success: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: "Start date and end date are required",
        data: null,
      });
    }

    const logs = await activityLogService.getLogsByDateRange(
      createdBy,
      new Date(startDate as string),
      new Date(endDate as string),
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Activity logs fetched successfully",
      data: logs,
    });
  }),
);

export const activityLogRoute = router;
