import { getBussines } from "../../api/bussines-api";

export const bussines = async () => {

  try {

    const { data } = await getBussines.get('/business');

    console.log(data);
    return [];


  } catch (error) {
    console.log(error);
    throw error;
  }

}