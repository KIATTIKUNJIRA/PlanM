export interface Ticket {
  id: string;
  title: string;
  description: string;
  asset_id: string; // Foreign key to Asset table
  reported_by: string; // Foreign key to User table
  assigned_to?: string; // Foreign key to User table (technician)
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: Date;
  resolved_at?: Date;
}