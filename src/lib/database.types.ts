// ==========================================================================
// Database Types (matches Supabase schema)
//
// TIP: After running migrations, regenerate this from Supabase CLI:
//   npx supabase gen types typescript --project-id YOUR_REF > src/lib/database.types.ts
// ==========================================================================

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          phone: string | null
          date_of_birth: string | null
          preferred_lang: string
          onboarded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          phone?: string | null
          date_of_birth?: string | null
          preferred_lang?: string
          onboarded?: boolean
        }
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      trips: {
        Row: {
          id: string
          name: string
          destination: string | null
          description: string | null
          cover_url: string | null
          start_date: string
          end_date: string
          status: 'planning' | 'active' | 'completed' | 'archived'
          default_currency: string
          budget_amount: number | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['trips']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['trips']['Insert']>
      }
      trip_members: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          status: 'pending' | 'approved'
          display_name: string | null
          passport_no: string | null
          nationality: string | null
          phone: string | null
          allergies: string | null
          dietary: string | null
          emergency_contact: string | null
          current_lat: number | null
          current_lng: number | null
          current_location_at: string | null
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['trip_members']['Row'], 'id' | 'joined_at'> & {
          id?: string
          status?: 'pending' | 'approved'
        }
        Update: Partial<Database['public']['Tables']['trip_members']['Insert']>
      }
      activity_types: {
        Row: {
          id: string
          label_th: string
          label_en: string
          icon: string
          color: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: Database['public']['Tables']['activity_types']['Row']
        Update: Partial<Database['public']['Tables']['activity_types']['Row']>
      }
      activities: {
        Row: {
          id: string
          trip_id: string
          type_id: string | null
          title: string
          description: string | null
          day_number: number | null
          start_at: string | null
          end_at: string | null
          location_name: string | null
          address: string | null
          latitude: number | null
          longitude: number | null
          cost_amount: number | null
          cost_currency: string
          status: 'idea' | 'planned' | 'booked' | 'done' | 'cancelled'
          url: string | null
          booking_ref: string | null
          notes: string | null
          sort_order: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
      }
      expense_categories: {
        Row: {
          id: string
          label_th: string
          label_en: string
          icon: string
          color: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: Database['public']['Tables']['expense_categories']['Row']
        Update: Partial<Database['public']['Tables']['expense_categories']['Row']>
      }
      expenses: {
        Row: {
          id: string
          trip_id: string
          activity_id: string | null
          category_id: string | null
          description: string
          amount: number
          currency: string
          fx_rate_to_thb: number | null
          paid_by: string | null
          paid_at: string
          receipt_url: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          member_id: string | null            // nullable now (placeholder slot)
          slot_label: string | null           // human label until claimed
          share_amount: number
          is_settled: boolean
          settled_at: string | null
          settled_proof_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['expense_splits']['Row'], 'id'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['expense_splits']['Insert']>
      }
      checklist_item_ticks: {
        Row: {
          id: string
          item_id: string
          member_id: string
          ticked_at: string
        }
        Insert: Omit<Database['public']['Tables']['checklist_item_ticks']['Row'], 'id' | 'ticked_at'> & {
          id?: string
          ticked_at?: string
        }
        Update: Partial<Database['public']['Tables']['checklist_item_ticks']['Insert']>
      }
      trip_invites: {
        Row: {
          id: string
          trip_id: string
          code: string
          role: 'editor' | 'viewer'
          max_uses: number | null
          used_count: number
          expires_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['trip_invites']['Row'], 'id' | 'used_count' | 'created_at'> & {
          id?: string
          used_count?: number
        }
        Update: Partial<Database['public']['Tables']['trip_invites']['Insert']>
      }
      documents: {
        Row: {
          id: string
          trip_id: string
          activity_id: string | null
          filename: string
          display_name: string | null
          description: string | null
          group_id: string | null
          file_url: string
          file_size: number | null
          mime_type: string | null
          category: 'ticket' | 'hotel' | 'insurance' | 'id' | 'receipt' | 'other'
          uploaded_by: string | null
          uploaded_at: string
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'uploaded_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      checklists: {
        Row: {
          id: string
          trip_id: string
          title: string
          is_shared: boolean
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['checklists']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['checklists']['Insert']>
      }
      checklist_items: {
        Row: {
          id: string
          checklist_id: string
          title: string
          description: string | null
          member_id: string | null
          is_done: boolean
          done_at: string | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['checklist_items']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['checklist_items']['Insert']>
      }
      activity_assignments: {
        Row: {
          id: string
          activity_id: string
          member_id: string
          status: 'going' | 'maybe' | 'skip'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_assignments']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['activity_assignments']['Insert']>
      }
    }
    Views: {}
    Functions: {
      accept_invite: {
        Args: { p_code: string }
        Returns: {
          pending?: boolean
          already_member?: boolean
          status?: 'pending' | 'approved'
          trip_id: string
          role?: string
        }
      }
      approve_trip_member: {
        Args: { p_member_id: string }
        Returns: { approved: boolean; trip_id: string }
      }
      claim_expense_slot: {
        Args: { p_split_id: string; p_member_id: string }
        Returns: { claimed: boolean; split_id: string; member_id: string }
      }
      get_invite_preview: {
        Args: { p_code: string }
        Returns: {
          id: string
          code: string
          role: 'editor' | 'viewer'
          max_uses: number | null
          used_count: number
          expires_at: string | null
          trip: {
            id: string
            name: string
            destination: string | null
            start_date: string
            end_date: string
            cover_url: string | null
            owner_id: string
          }
          owner: {
            display_name: string
            avatar_url: string | null
          }
        } | null
      }
      get_trip_stats: {
        Args: { p_trip_id: string }
        Returns: {
          total_spent: number
          total_activities: number
          booked_activities: number
          total_members: number
          currency: string
          budget: number | null
        }
      }
      calculate_trip_debts: {
        Args: { p_trip_id: string }
        Returns: Array<{
          from_member_id: string
          from_member_name: string
          to_member_id: string
          to_member_name: string
          amount: number
        }>
      }
    }
    Enums: {}
  }
}

// ===== Convenience type exports =====
export type Trip = Database['public']['Tables']['trips']['Row']
export type TripMember = Database['public']['Tables']['trip_members']['Row']
export type Activity = Database['public']['Tables']['activities']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseSplit = Database['public']['Tables']['expense_splits']['Row']
export type ActivityType = Database['public']['Tables']['activity_types']['Row']
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
export type TripInvite = Database['public']['Tables']['trip_invites']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
