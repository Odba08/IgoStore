export interface MenuCategory {
    id: string;
    name: string;
    business: {
        id: string;
        name: string;
    };
    products?: any[]; 
}