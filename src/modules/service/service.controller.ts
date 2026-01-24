import { Router } from "express";
import httpStatus from "http-status";
import { isAuth } from "../../middleware/is_auth";
import validateRequest from "../../middleware/validate_request.middleware";
import catchAsync from "../../utils/catch_async.utils";
import sendResponse from "../../utils/send_response.utils";
import { serviceService } from "./service.service";
import { serviceValidation } from "./service.validation";

const router = Router();

// All routes require authentication
router.use(isAuth);

// Create service
router.post(
  "/",
  validateRequest(serviceValidation.createServiceValidationSchema),
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const serviceData = req.body;
    const service = await serviceService.createService(createdBy, serviceData);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Service created successfully",
      data: service,
    });
  }),
);

// Get all services with pagination, sorting, filtering
router.get(
  "/",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const result = await serviceService.getAllServices(createdBy, req.query);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Services fetched successfully",
      meta: result.meta,
      data: result.result,
    });
  }),
);

// Get services by staff type
router.get(
  "/by-staff-type/:staffType",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { staffType } = req.params;
    const services = await serviceService.getServicesByStaffType(
      createdBy,
      staffType,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Services fetched successfully",
      data: services,
    });
  }),
);

// Get services by duration
router.get(
  "/by-duration/:duration",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const duration = parseInt(req.params.duration);
    const services = await serviceService.getServicesByDuration(
      createdBy,
      duration,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Services fetched successfully",
      data: services,
    });
  }),
);

// Get service by ID
router.get(
  "/:id",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    const service = await serviceService.getServiceById(createdBy, id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Service fetched successfully",
      data: service,
    });
  }),
);

// Update service
router.patch(
  "/:id",
  validateRequest(serviceValidation.updateServiceValidationSchema),
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    const updateData = req.body;
    const service = await serviceService.updateService(
      createdBy,
      id,
      updateData,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Service updated successfully",
      data: service,
    });
  }),
);

// Soft delete service
router.delete(
  "/:id",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    await serviceService.deleteService(createdBy, id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Service deleted successfully",
      data: null,
    });
  }),
);

export const serviceRoute = router;
