import { environment } from "src/environments/environment";

export const URL_BACKEND = environment.API_URL.replace(/\/api\/?$/, ''); // Remove /api suffix to get base URL
export const URL_SERVICE = environment.API_URL;
export const URL_FRONTEND = environment.APP_URL;
