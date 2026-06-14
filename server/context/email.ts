import { createAPI } from "manolo-in";

const api = createAPI();

export const sendEmail = api.email.sendMail;
