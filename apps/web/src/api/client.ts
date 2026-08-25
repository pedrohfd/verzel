import { env } from "@verzel/env/web";
import axios from "axios";

import { getServerOrigin } from "@/lib/server-url";

export const apiClient = axios.create({
	baseURL: getServerOrigin(env.VITE_SERVER_URL),
	withCredentials: true,
});
