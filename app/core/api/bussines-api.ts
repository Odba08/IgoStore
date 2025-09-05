import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const getBussines = axios.create({
  baseURL: `${API_URL}/api`
});
