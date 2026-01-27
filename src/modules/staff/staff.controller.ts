import { Router } from "express";
import httpStatus from "http-status";
import { isAuth } from "../../middleware/is_auth";
import validateRequest from "../../middleware/validate_request.middleware";
import catchAsync from "../../utils/catch_async.utils";
import sendResponse from "../../utils/send_response.utils";
import { staffService } from "./staff.service";
import { staffValidation } from "./staff.validation";

const router = Router();

// All routes require authentication
router.use(isAuth);

// Create staff
router.post(
  "/",
  validateRequest(staffValidation.createStaffValidationSchema),
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const staffData = req.body;
    const staff = await staffService.createStaff(createdBy, staffData);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Staff created successfully",
      data: staff,
    });
  }),
);

// Get all staff with pagination, sorting, filtering
router.get(
  "/",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const result = await staffService.getAllStaff(createdBy, req.query);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Staff fetched successfully",
      meta: result.meta,
      data: result.result,
    });
  }),
);

// Get staff by ID
router.get(
  "/:id",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    const staff = await staffService.getStaffById(createdBy, id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Staff fetched successfully",
      data: staff,
    });
  }),
);

// Update staff
router.patch(
  "/:id",
  validateRequest(staffValidation.updateStaffValidationSchema),
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    const updateData = req.body;
    const staff = await staffService.updateStaff(createdBy, id, updateData);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Staff updated successfully",
      data: staff,
    });
  }),
);

// Soft delete staff
router.delete(
  "/:id",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    await staffService.deleteStaff(createdBy, id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Staff deleted successfully",
      data: null,
    });
  }),
);

// Get available staff by service type
router.get(
  "/available/:serviceType",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { serviceType } = req.params;
    const staff = await staffService.getAvailableStaffByType(
      createdBy,
      serviceType,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Available staff fetched successfully",
      data: staff,
    });
  }),
);
// staff type list
router.get(
  "/type/list",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const staffTypeList = await staffService.getStaffTypeList(createdBy);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Staff type list fetched successfully",
      data: staffTypeList,
    });
  }),
);

export const staffRoute = router;
