export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          onboarded?: boolean;
        };
        Update: {
          name?: string;
          email?: string;
          avatar_url?: string | null;
          onboarded?: boolean;
        };
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          brand: string;
          model: string;
          version: string | null;
          year_fab: number | null;
          year_model: number;
          current_mileage: number;
          fuel_type: string | null;
          transmission: string | null;
          color: string | null;
          plate: string | null;
          nickname: string | null;
          photo_url: string | null;
          monthly_usage: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          brand: string;
          model: string;
          version?: string | null;
          year_fab?: number | null;
          year_model: number;
          current_mileage?: number;
          fuel_type?: string | null;
          transmission?: string | null;
          color?: string | null;
          plate?: string | null;
          nickname?: string | null;
          photo_url?: string | null;
          monthly_usage?: string | null;
          archived?: boolean;
        };
        Update: Partial<Database['public']['Tables']['vehicles']['Row']>;
      };
      mileage_records: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          mileage: number;
          previous_mileage: number;
          correction: boolean;
          note: string | null;
          recorded_at: string;
          created_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          mileage: number;
          previous_mileage: number;
          correction?: boolean;
          note?: string | null;
          recorded_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mileage_records']['Row']>;
      };
      maintenance_catalog: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: string;
          description: string | null;
          default_km: number | null;
          default_months: number | null;
          is_custom: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          category: string;
          description?: string | null;
          default_km?: number | null;
          default_months?: number | null;
          is_custom?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['maintenance_catalog']['Row']>;
      };
      vehicle_maintenance_items: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          catalog_id: string | null;
          custom_name: string | null;
          name: string;
          category: string;
          last_done_date: string | null;
          last_done_mileage: number | null;
          interval_km: number | null;
          interval_months: number | null;
          manual_interval: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          catalog_id?: string | null;
          custom_name?: string | null;
          name: string;
          category: string;
          interval_km?: number | null;
          interval_months?: number | null;
          manual_interval?: boolean;
        };
        Update: Partial<Database['public']['Tables']['vehicle_maintenance_items']['Row']>;
      };
      maintenance_records: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          service_date: string;
          mileage: number;
          total_amount: number | null;
          workshop: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          service_date: string;
          mileage: number;
          total_amount?: number | null;
          workshop?: string | null;
          note?: string | null;
        };
        Update: Partial<Database['public']['Tables']['maintenance_records']['Row']>;
      };
      maintenance_record_items: {
        Row: {
          id: string;
          record_id: string;
          maintenance_item_id: string;
          amount: number | null;
          created_at: string;
        };
        Insert: {
          record_id: string;
          maintenance_item_id: string;
          amount?: number | null;
        };
        Update: Partial<Database['public']['Tables']['maintenance_record_items']['Row']>;
      };
      expenses: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          category: string;
          description: string;
          amount: number;
          expense_date: string;
          mileage: number | null;
          created_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          category: string;
          description: string;
          amount: number;
          expense_date: string;
          mileage?: number | null;
        };
        Update: Partial<Database['public']['Tables']['expenses']['Row']>;
      };
      fuel_records: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          fuel_date: string;
          mileage: number;
          liters: number;
          total_cost: number;
          price_per_liter: number;
          fuel_type: string;
          station: string | null;
          full_tank: boolean;
          created_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          fuel_date: string;
          mileage: number;
          liters: number;
          total_cost: number;
          price_per_liter: number;
          fuel_type: string;
          station?: string | null;
          full_tank?: boolean;
        };
        Update: Partial<Database['public']['Tables']['fuel_records']['Row']>;
      };
      vehicle_documents: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          name: string;
          category: string;
          due_date: string | null;
          amount: number | null;
          note: string | null;
          file_url: string | null;
          created_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          name: string;
          category: string;
          due_date?: string | null;
          amount?: number | null;
          note?: string | null;
          file_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['vehicle_documents']['Row']>;
      };
      attachments: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          record_id: string | null;
          document_id: string | null;
          file_url: string;
          file_name: string;
          category: string;
          created_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          record_id?: string | null;
          document_id?: string | null;
          file_url: string;
          file_name: string;
          category: string;
        };
        Update: Partial<Database['public']['Tables']['attachments']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string | null;
          type: string;
          title: string;
          body: string | null;
          severity: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          vehicle_id?: string | null;
          type: string;
          title: string;
          body?: string | null;
          severity: string;
          read?: boolean;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
      reminders: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          name: string;
          due_date: string;
          amount: number | null;
          note: string | null;
          file_url: string | null;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          name: string;
          due_date: string;
          amount?: number | null;
          note?: string | null;
          file_url?: string | null;
          completed?: boolean;
        };
        Update: Partial<Database['public']['Tables']['reminders']['Row']>;
      };
      user_preferences: {
        Row: {
          user_id: string;
          theme: string;
          currency: string;
          distance_unit: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: string;
          currency?: string;
          distance_unit?: string;
        };
        Update: Partial<Database['public']['Tables']['user_preferences']['Row']>;
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string | null;
          action: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          vehicle_id?: string | null;
          action: string;
          metadata?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['activity_logs']['Row']>;
      };
      vehicle_members: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          role: string;
        };
        Update: Partial<Database['public']['Tables']['vehicle_members']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_demo_data: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      delete_current_user: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
