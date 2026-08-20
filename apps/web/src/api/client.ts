import { env } from "@verzel/env/web";
import axios from "axios";

export const apiClient = axios.create({
	baseURL: env.VITE_SERVER_URL,
	withCredentials: true,
});
