export interface Category {

  _id: string;

  name: string;

  description?: string;

  status: "active" | "inactive";

  productCount?: number;

}


export interface CreateCategoryDto {

  name: string;

  description?: string;

  status?: "active" | "inactive";

}


export interface UpdateCategoryDto {

  name?: string;

  description?: string;

  status?: "active" | "inactive";

}