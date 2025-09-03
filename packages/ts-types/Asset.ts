export interface Asset {
  id: string;
  name: string;
  type: 'AC' | 'REFRIGERATOR' | 'LIGHTING' | 'PUMP';
  location_id: string; // Foreign key to location/branch table
  floor_plan_coordinates: { x: number; y: number };
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'DEFECTIVE';
  last_maintenance_date?: Date;
  install_date: Date;
}