export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          metadata: Json | null;
          user_id: string;
          vehicle_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          user_id: string;
          vehicle_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          user_id?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          category: string;
          created_at: string;
          document_id: string | null;
          file_name: string;
          file_url: string;
          id: string;
          record_id: string | null;
          user_id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          category?: string;
          created_at?: string;
          document_id?: string | null;
          file_name: string;
          file_url: string;
          id?: string;
          record_id?: string | null;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          document_id?: string | null;
          file_name?: string;
          file_url?: string;
          id?: string;
          record_id?: string | null;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_record_id_fkey";
            columns: ["record_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          description: string;
          expense_date: string;
          id: string;
          mileage: number | null;
          user_id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          description: string;
          expense_date: string;
          id?: string;
          mileage?: number | null;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          description?: string;
          expense_date?: string;
          id?: string;
          mileage?: number | null;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      fuel_records: {
        Row: {
          created_at: string;
          fuel_date: string;
          fuel_type: string;
          full_tank: boolean;
          id: string;
          liters: number;
          mileage: number;
          price_per_liter: number;
          station: string | null;
          total_cost: number;
          user_id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          fuel_date: string;
          fuel_type: string;
          full_tank?: boolean;
          id?: string;
          liters: number;
          mileage: number;
          price_per_liter: number;
          station?: string | null;
          total_cost: number;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          fuel_date?: string;
          fuel_type?: string;
          full_tank?: boolean;
          id?: string;
          liters?: number;
          mileage?: number;
          price_per_liter?: number;
          station?: string | null;
          total_cost?: number;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fuel_records_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_catalog: {
        Row: {
          category: string;
          created_at: string;
          default_km: number | null;
          default_months: number | null;
          description: string | null;
          id: string;
          is_custom: boolean;
          name: string;
          slug: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          created_at?: string;
          default_km?: number | null;
          default_months?: number | null;
          description?: string | null;
          id?: string;
          is_custom?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          category?: string;
          created_at?: string;
          default_km?: number | null;
          default_months?: number | null;
          description?: string | null;
          id?: string;
          is_custom?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      maintenance_interval_history: {
        Row: {
          changed_at: string;
          id: string;
          item_id: string;
          new_interval_km: number | null;
          new_interval_months: number | null;
          old_interval_km: number | null;
          old_interval_months: number | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          changed_at?: string;
          id?: string;
          item_id: string;
          new_interval_km?: number | null;
          new_interval_months?: number | null;
          old_interval_km?: number | null;
          old_interval_months?: number | null;
          user_id: string;
        };
        Update: {
          changed_at?: string;
          id?: string;
          item_id?: string;
          new_interval_km?: number | null;
          new_interval_months?: number | null;
          old_interval_km?: number | null;
          old_interval_months?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_interval_history_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_maintenance_items";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_recommendations: {
        Row: {
          brand: string | null;
          catalog_id: string;
          created_at: string;
          engine: string | null;
          fuel_type: string | null;
          id: string;
          interval_km: number | null;
          interval_months: number | null;
          model: string | null;
          origin: string;
          source_note: string | null;
          transmission: string | null;
          version: string | null;
          year_end: number | null;
          year_start: number | null;
        };
        ComputedFields: never;
        Insert: {
          brand?: string | null;
          catalog_id: string;
          created_at?: string;
          engine?: string | null;
          fuel_type?: string | null;
          id?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          model?: string | null;
          origin?: string;
          source_note?: string | null;
          transmission?: string | null;
          version?: string | null;
          year_end?: number | null;
          year_start?: number | null;
        };
        Update: {
          brand?: string | null;
          catalog_id?: string;
          created_at?: string;
          engine?: string | null;
          fuel_type?: string | null;
          id?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          model?: string | null;
          origin?: string;
          source_note?: string | null;
          transmission?: string | null;
          version?: string | null;
          year_end?: number | null;
          year_start?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_recommendations_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_catalog";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_record_items: {
        Row: {
          amount: number | null;
          created_at: string;
          id: string;
          maintenance_item_id: string;
          record_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number | null;
          created_at?: string;
          id?: string;
          maintenance_item_id: string;
          record_id: string;
        };
        Update: {
          amount?: number | null;
          created_at?: string;
          id?: string;
          maintenance_item_id?: string;
          record_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_record_items_maintenance_item_id_fkey";
            columns: ["maintenance_item_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_maintenance_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_record_items_record_id_fkey";
            columns: ["record_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_records";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_records: {
        Row: {
          created_at: string;
          id: string;
          mileage: number;
          note: string | null;
          service_date: string;
          total_amount: number;
          updated_at: string;
          user_id: string;
          vehicle_id: string;
          workshop: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          mileage: number;
          note?: string | null;
          service_date: string;
          total_amount?: number;
          updated_at?: string;
          user_id: string;
          vehicle_id: string;
          workshop?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          mileage?: number;
          note?: string | null;
          service_date?: string;
          total_amount?: number;
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string;
          workshop?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      mileage_records: {
        Row: {
          correction: boolean;
          created_at: string;
          id: string;
          mileage: number;
          note: string | null;
          previous_mileage: number;
          recorded_at: string;
          user_id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          correction?: boolean;
          created_at?: string;
          id?: string;
          mileage: number;
          note?: string | null;
          previous_mileage: number;
          recorded_at?: string;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          correction?: boolean;
          created_at?: string;
          id?: string;
          mileage?: number;
          note?: string | null;
          previous_mileage?: number;
          recorded_at?: string;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mileage_records_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          read: boolean;
          severity: string;
          title: string;
          type: string;
          user_id: string;
          vehicle_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          read?: boolean;
          severity?: string;
          title: string;
          type: string;
          user_id: string;
          vehicle_id?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          read?: boolean;
          severity?: string;
          title?: string;
          type?: string;
          user_id?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          id: string;
          name: string;
          onboarded: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          id: string;
          name: string;
          onboarded?: boolean;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          onboarded?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          amount: number | null;
          completed: boolean;
          created_at: string;
          due_date: string;
          file_url: string | null;
          id: string;
          name: string;
          note: string | null;
          user_id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number | null;
          completed?: boolean;
          created_at?: string;
          due_date: string;
          file_url?: string | null;
          id?: string;
          name: string;
          note?: string | null;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          amount?: number | null;
          completed?: boolean;
          created_at?: string;
          due_date?: string;
          file_url?: string | null;
          id?: string;
          name?: string;
          note?: string | null;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          admin_note: string | null;
          category: string;
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          admin_note?: string | null;
          category: string;
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          category?: string;
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          currency: string;
          distance_unit: string;
          theme: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          currency?: string;
          distance_unit?: string;
          theme?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          currency?: string;
          distance_unit?: string;
          theme?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          must_change_password: boolean;
          role: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          must_change_password?: boolean;
          role?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          must_change_password?: boolean;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      vehicle_brands: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      vehicle_documents: {
        Row: {
          amount: number | null;
          category: string;
          created_at: string;
          due_date: string | null;
          file_url: string | null;
          id: string;
          name: string;
          note: string | null;
          user_id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number | null;
          category: string;
          created_at?: string;
          due_date?: string | null;
          file_url?: string | null;
          id?: string;
          name: string;
          note?: string | null;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          amount?: number | null;
          category?: string;
          created_at?: string;
          due_date?: string | null;
          file_url?: string | null;
          id?: string;
          name?: string;
          note?: string | null;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_maintenance_items: {
        Row: {
          catalog_id: string | null;
          category: string;
          created_at: string;
          custom_name: string | null;
          id: string;
          interval_km: number | null;
          interval_months: number | null;
          last_done_date: string | null;
          last_done_mileage: number | null;
          manual_interval: boolean;
          name: string;
          notes: string | null;
          origin: string;
          updated_at: string;
          user_id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          catalog_id?: string | null;
          category: string;
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          last_done_date?: string | null;
          last_done_mileage?: number | null;
          manual_interval?: boolean;
          name: string;
          notes?: string | null;
          origin?: string;
          updated_at?: string;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          catalog_id?: string | null;
          category?: string;
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          last_done_date?: string | null;
          last_done_mileage?: number | null;
          manual_interval?: boolean;
          name?: string;
          notes?: string | null;
          origin?: string;
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_items_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_maintenance_items_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_members: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          user_id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_members_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_models: {
        Row: {
          brand_id: string;
          id: string;
          name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          brand_id: string;
          id?: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          brand_id?: string;
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_models_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_brands";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_versions: {
        Row: {
          id: string;
          model_id: string;
          name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          model_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          model_id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_versions_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          archived: boolean;
          brand: string;
          color: string | null;
          created_at: string;
          current_mileage: number;
          fuel_type: string | null;
          id: string;
          model: string;
          monthly_usage: string | null;
          nickname: string | null;
          photo_url: string | null;
          plate: string | null;
          severe_usage: boolean;
          transmission: string | null;
          updated_at: string;
          usage_type: string;
          user_id: string;
          version: string | null;
          year_fab: number | null;
          year_model: number;
        };
        ComputedFields: never;
        Insert: {
          archived?: boolean;
          brand: string;
          color?: string | null;
          created_at?: string;
          current_mileage?: number;
          fuel_type?: string | null;
          id?: string;
          model: string;
          monthly_usage?: string | null;
          nickname?: string | null;
          photo_url?: string | null;
          plate?: string | null;
          severe_usage?: boolean;
          transmission?: string | null;
          updated_at?: string;
          usage_type?: string;
          user_id: string;
          version?: string | null;
          year_fab?: number | null;
          year_model: number;
        };
        Update: {
          archived?: boolean;
          brand?: string;
          color?: string | null;
          created_at?: string;
          current_mileage?: number;
          fuel_type?: string | null;
          id?: string;
          model?: string;
          monthly_usage?: string | null;
          nickname?: string | null;
          photo_url?: string | null;
          plate?: string | null;
          severe_usage?: boolean;
          transmission?: string | null;
          updated_at?: string;
          usage_type?: string;
          user_id?: string;
          version?: string | null;
          year_fab?: number | null;
          year_model?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_current_user: { Args: Record<PropertyKey, never>; Returns: undefined };
      export_user_data_snapshot: { Args: Record<PropertyKey, never>; Returns: Json };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_vehicle_member: { Args: { vehicle_id: string }; Returns: boolean };
      list_user_files: { Args: Record<PropertyKey, never>; Returns: string[] };
      must_change_password: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
