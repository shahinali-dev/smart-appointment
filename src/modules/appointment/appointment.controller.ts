import { Router } from "express";
import httpStatus from "http-status";
import { isAuth } from "../../middleware/is_auth";
import validateRequest from "../../middleware/validate_request.middleware";
import catchAsync from "../../utils/catch_async.utils";
import sendResponse from "../../utils/send_response.utils";
import { appointmentService } from "./appointment.service";
import { appointmentValidation } from "./appointment.validation";

const router = Router();

// All routes require authentication
router.use(isAuth);

// Create appointment
router.post(
  "/",
  validateRequest(appointmentValidation.createAppointmentValidationSchema),
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const appointmentData = req.body;
    const appointment = await appointmentService.createAppointment(
      createdBy,
      appointmentData,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Appointment created successfully",
      data: appointment,
    });
  }),
);

// Get all appointments with pagination, sorting, filtering
router.get(
  "/",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const result = await appointmentService.getAllAppointments(
      createdBy,
      req.query,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointments fetched successfully",
      meta: result.meta,
      data: result.result,
    });
  }),
);

// Get waiting queue
router.get(
  "/queue",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const queue = await appointmentService.getWaitingQueue(createdBy);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Waiting queue fetched successfully",
      data: queue,
    });
  }),
);

// Get appointments by date
router.get(
  "/by-date/:date",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { date } = req.params;
    const appointments = await appointmentService.getAppointmentsByDate(
      createdBy,
      date,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointments fetched successfully",
      data: appointments,
    });
  }),
);

router.get(
  "/date-list",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const dateList = await appointmentService.getAppointmentDateList(createdBy);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Date list fetched successfully",
      data: dateList,
    });
  }),
);

// Get appointments by staff
router.get(
  "/by-staff/:staffId",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { staffId } = req.params;
    const appointments = await appointmentService.getAppointmentsByStaff(
      createdBy,
      staffId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointments fetched successfully",
      data: appointments,
    });
  }),
);

// Get staff load by date
router.get(
  "/staff-load/:date",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { date } = req.params;
    const staffLoad = await appointmentService.getStaffLoadByDate(
      createdBy,
      date,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Staff load fetched successfully",
      data: staffLoad,
    });
  }),
);

// Get appointment by ID
router.get(
  "/:id",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    const appointment = await appointmentService.getAppointmentById(
      createdBy,
      id,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment fetched successfully",
      data: appointment,
    });
  }),
);

// Update appointment
router.patch(
  "/:id",
  validateRequest(appointmentValidation.updateAppointmentValidationSchema),
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    const updateData = req.body;
    const appointment = await appointmentService.updateAppointment(
      createdBy,
      id,
      updateData,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment updated successfully",
      data: appointment,
    });
  }),
);

// Assign staff to appointment
router.patch(
  "/:id/assign-staff",
  validateRequest(appointmentValidation.assignStaffValidationSchema),
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    const { staffId } = req.body;
    const appointment = await appointmentService.assignStaffToAppointment(
      createdBy,
      id,
      staffId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Staff assigned successfully",
      data: appointment,
    });
  }),
);

// Soft delete appointment
router.delete(
  "/:id",
  catchAsync(async (req, res) => {
    const createdBy = req.user!._id.toString();
    const { id } = req.params;
    await appointmentService.deleteAppointment(createdBy, id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment deleted successfully",
      data: null,
    });
  }),
);

export const appointmentRoute = router;
