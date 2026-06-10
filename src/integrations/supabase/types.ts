export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contracts: {
        Row: {
          contract_document_url: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          id: string
          signature_method: string | null
          signed_at: string | null
          signed_by: string | null
          signnow_document_id: string | null
          signnow_link: string | null
          staff_user_id: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          submitted_at: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          contract_document_url?: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          id?: string
          signature_method?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signnow_document_id?: string | null
          signnow_link?: string | null
          staff_user_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          submitted_at?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          contract_document_url?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          id?: string
          signature_method?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signnow_document_id?: string | null
          signnow_link?: string | null
          staff_user_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          submitted_at?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_addresses: {
        Row: {
          address: string | null
          cell_phone: string | null
          city: string | null
          created_at: string
          id: string
          postal_code: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cell_phone?: string | null
          city?: string | null
          created_at?: string
          id?: string
          postal_code?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cell_phone?: string | null
          city?: string | null
          created_at?: string
          id?: string
          postal_code?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_addresses_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_managers: {
        Row: {
          cell_phone: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          landline_phone: string | null
          last_name: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          cell_phone?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          landline_phone?: string | null
          last_name?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          cell_phone?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          landline_phone?: string | null
          last_name?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_managers_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          address: string | null
          cell_phone: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          postal_code: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cell_phone?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          postal_code?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cell_phone?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          postal_code?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "managers_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          id: string
          staff_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          staff_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          staff_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: true
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          accepts_marketing: boolean | null
          accommodation_name: string | null
          address: string | null
          cell_phone: string
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          created_by_email: string | null
          email: string
          first_name: string
          id: string
          landline_phone: string | null
          last_name: string
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          accepts_marketing?: boolean | null
          accommodation_name?: string | null
          address?: string | null
          cell_phone: string
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by_email?: string | null
          email: string
          first_name: string
          id?: string
          landline_phone?: string | null
          last_name: string
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          accepts_marketing?: boolean | null
          accommodation_name?: string | null
          address?: string | null
          cell_phone?: string
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by_email?: string | null
          email?: string
          first_name?: string
          id?: string
          landline_phone?: string | null
          last_name?: string
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_created_by_email_fkey"
            columns: ["created_by_email"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["email"]
          },
        ]
      }
      subscription_version_addons: {
        Row: {
          addon_id: string
          addon_name: string
          created_at: string
          id: string
          monthly_price: number
          version_id: string
        }
        Insert: {
          addon_id: string
          addon_name: string
          created_at?: string
          id?: string
          monthly_price: number
          version_id: string
        }
        Update: {
          addon_id?: string
          addon_name?: string
          created_at?: string
          id?: string
          monthly_price?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_version_addons_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "subscription_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_versions: {
        Row: {
          additional_screens: number | null
          change_reason: string | null
          contract_signed_date: string | null
          created_at: string
          created_by_email: string | null
          currency: string
          custom_item_name: string | null
          custom_item_price: number | null
          duration_months: number
          end_date: string
          id: string
          is_contract_reset: boolean | null
          is_superseded: boolean | null
          monthly_addons_price: number | null
          monthly_base_price: number
          monthly_screens_price: number | null
          monthly_total_price: number
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id: string
          version_number: number
        }
        Insert: {
          additional_screens?: number | null
          change_reason?: string | null
          contract_signed_date?: string | null
          created_at?: string
          created_by_email?: string | null
          currency: string
          custom_item_name?: string | null
          custom_item_price?: number | null
          duration_months: number
          end_date: string
          id?: string
          is_contract_reset?: boolean | null
          is_superseded?: boolean | null
          monthly_addons_price?: number | null
          monthly_base_price: number
          monthly_screens_price?: number | null
          monthly_total_price: number
          plan_id: string
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id: string
          version_number: number
        }
        Update: {
          additional_screens?: number | null
          change_reason?: string | null
          contract_signed_date?: string | null
          created_at?: string
          created_by_email?: string | null
          currency?: string
          custom_item_name?: string | null
          custom_item_price?: number | null
          duration_months?: number
          end_date?: string
          id?: string
          is_contract_reset?: boolean | null
          is_superseded?: boolean | null
          monthly_addons_price?: number | null
          monthly_base_price?: number
          monthly_screens_price?: number | null
          monthly_total_price?: number
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_versions_created_by_email_fkey"
            columns: ["created_by_email"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "subscription_versions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          accommodation_name: string
          created_at: string
          created_by_email: string | null
          current_version_id: string | null
          id: string
          location: Database["public"]["Enums"]["location_type"]
          subscriber_id: string
        }
        Insert: {
          accommodation_name: string
          created_at?: string
          created_by_email?: string | null
          current_version_id?: string | null
          id?: string
          location: Database["public"]["Enums"]["location_type"]
          subscriber_id: string
        }
        Update: {
          accommodation_name?: string
          created_at?: string
          created_by_email?: string | null
          current_version_id?: string | null
          id?: string
          location?: Database["public"]["Enums"]["location_type"]
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "subscription_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_created_by_email_fkey"
            columns: ["created_by_email"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "subscriptions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_version: {
        Args: { p_subscription_id: string }
        Returns: {
          additional_screens: number | null
          change_reason: string | null
          contract_signed_date: string | null
          created_at: string
          created_by_email: string | null
          currency: string
          custom_item_name: string | null
          custom_item_price: number | null
          duration_months: number
          end_date: string
          id: string
          is_contract_reset: boolean | null
          is_superseded: boolean | null
          monthly_addons_price: number | null
          monthly_base_price: number
          monthly_screens_price: number | null
          monthly_total_price: number
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "subscription_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_version_at_date: {
        Args: { p_date: string; p_subscription_id: string }
        Returns: {
          additional_screens: number | null
          change_reason: string | null
          contract_signed_date: string | null
          created_at: string
          created_by_email: string | null
          currency: string
          custom_item_name: string | null
          custom_item_price: number | null
          duration_months: number
          end_date: string
          id: string
          is_contract_reset: boolean | null
          is_superseded: boolean | null
          monthly_addons_price: number | null
          monthly_base_price: number
          monthly_screens_price: number | null
          monthly_total_price: number
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "subscription_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "viewer"
      contract_status: "pending" | "signed" | "rejected"
      contract_type: "in_person" | "remote"
      location_type:
        | "saint-barthelemy"
        | "saint-martin"
        | "sint-maarten"
        | "other"
      subscription_status: "active" | "suspended" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "viewer"],
      contract_status: ["pending", "signed", "rejected"],
      contract_type: ["in_person", "remote"],
      location_type: [
        "saint-barthelemy",
        "saint-martin",
        "sint-maarten",
        "other",
      ],
      subscription_status: ["active", "suspended", "cancelled"],
    },
  },
} as const
