import { Router } from "express";
import { authRoute } from "../modules/auth/auth.controller";
import { staffRoute } from "../modules/staff/staff.controller";
import { userRoute } from "../modules/user/user.controller";

const router = Router();

const moduleRoutes = [
  {
    path: "/v1/auth",
    route: authRoute,
  },

  {
    path: "/v1/user",
    route: userRoute,
  },
  {
    path: "/v1/staff",
    route: staffRoute,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
