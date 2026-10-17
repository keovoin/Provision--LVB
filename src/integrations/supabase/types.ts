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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alert_settings: {
        Row: {
          enabled: boolean
          id: boolean
          notify_low_stock: boolean
          notify_new_order: boolean
          notify_paid: boolean
          telegram_bot_token: string | null
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          notify_low_stock?: boolean
          notify_new_order?: boolean
          notify_paid?: boolean
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: boolean
          notify_low_stock?: boolean
          notify_new_order?: boolean
          notify_paid?: boolean
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          company_profile: string
          delivery_fee_usd: number
          delivery_information: string
          exchange_rate: number
          facebook_url: string
          free_delivery_min_usd: number | null
          id: boolean
          min_order_usd: number
          payment_provider_label: string
          privacy_policy: string
          returns_refunds_policy: string
          shipping_info_km: string
          telegram_url: string
          terms_conditions: string
          updated_at: string
        }
        Insert: {
          company_profile?: string
          delivery_fee_usd?: number
          delivery_information?: string
          exchange_rate?: number
          facebook_url?: string
          free_delivery_min_usd?: number | null
          id?: boolean
          min_order_usd?: number
          payment_provider_label?: string
          privacy_policy?: string
          returns_refunds_policy?: string
          shipping_info_km?: string
          telegram_url?: string
          terms_conditions?: string
          updated_at?: string
        }
        Update: {
          company_profile?: string
          delivery_fee_usd?: number
          delivery_information?: string
          exchange_rate?: number
          facebook_url?: string
          free_delivery_min_usd?: number | null
          id?: boolean
          min_order_usd?: number
          payment_provider_label?: string
          privacy_policy?: string
          returns_refunds_policy?: string
          shipping_info_km?: string
          telegram_url?: string
          terms_conditions?: string
          updated_at?: string
        }
        Relationships: []
      }
      banner_clicks: {
        Row: {
          banner_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          banner_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          banner_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "banner_clicks_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "banners"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_path: string | null
          link_id: string
          link_type: string
          sort_order: number
          subtitle_en: string | null
          subtitle_km: string | null
          title_en: string
          title_km: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_path?: string | null
          link_id: string
          link_type?: string
          sort_order?: number
          subtitle_en?: string | null
          subtitle_km?: string | null
          title_en: string
          title_km: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_path?: string | null
          link_id?: string
          link_type?: string
          sort_order?: number
          subtitle_en?: string | null
          subtitle_km?: string | null
          title_en?: string
          title_km?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          icon: string
          id: string
          name_en: string
          name_km: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          icon?: string
          id?: string
          name_en: string
          name_km: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          icon?: string
          id?: string
          name_en?: string
          name_km?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      credit_requests: {
        Row: {
          amount_usd: number
          created_at: string
          customer_id: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          customer_id?: string
          id?: string
          note?: string | null
          status?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          customer_id?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address: string
          created_at: string
          customer_id: string
          id: string
          label: string
          lat: number | null
          lng: number | null
        }
        Insert: {
          address: string
          created_at?: string
          customer_id?: string
          id?: string
          label?: string
          lat?: number | null
          lng?: number | null
        }
        Update: {
          address?: string
          created_at?: string
          customer_id?: string
          id?: string
          label?: string
          lat?: number | null
          lng?: number | null
        }
        Relationships: []
      }
      customer_requests: {
        Row: {
          created_at: string
          customer_id: string
          details: string
          id: string
          kind: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          details: string
          id: string
          kind: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          details?: string
          id?: string
          kind?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      db_backups: {
        Row: {
          created_at: string
          data: Json
          id: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          size_bytes?: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          size_bytes?: number
        }
        Relationships: []
      }
      drop_items: {
        Row: {
          drop_id: string
          id: string
          product_id: string
          qty: number
        }
        Insert: {
          drop_id: string
          id?: string
          product_id: string
          qty: number
        }
        Update: {
          drop_id?: string
          id?: string
          product_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "drop_items_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      drops: {
        Row: {
          active: boolean
          created_at: string
          customer_id: string
          days: string[]
          delivery_time: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_id: string
          days?: string[]
          delivery_time: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_id?: string
          days?: string[]
          delivery_time?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "drops_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          line_total_usd: number
          order_id: string
          product_id: string
          qty: number
          unit_price_usd: number
        }
        Insert: {
          id?: string
          line_total_usd: number
          order_id: string
          product_id: string
          qty: number
          unit_price_usd: number
        }
        Update: {
          id?: string
          line_total_usd?: number
          order_id?: string
          product_id?: string
          qty?: number
          unit_price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          banner_id: string | null
          created_at: string
          currency: string
          customer_id: string
          delivery_address: string
          delivery_fee_usd: number
          delivery_lat: number | null
          delivery_lng: number | null
          discount_usd: number
          id: string
          note: string | null
          order_no: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          promo_code: string | null
          status: Database["public"]["Enums"]["order_status"]
          stock_reserved: boolean
          total_usd: number
          updated_at: string
        }
        Insert: {
          banner_id?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          delivery_address: string
          delivery_fee_usd?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount_usd?: number
          id?: string
          note?: string | null
          order_no?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          promo_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_reserved?: boolean
          total_usd?: number
          updated_at?: string
        }
        Update: {
          banner_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          delivery_address?: string
          delivery_fee_usd?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount_usd?: number
          id?: string
          note?: string | null
          order_no?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          promo_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_reserved?: boolean
          total_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_khr: number
          amount_usd: number
          bank_ref: string | null
          checkout_url: string | null
          created_at: string
          credit_due_at: string | null
          customer_id: string
          id: string
          khqr_code: string | null
          khqr_expiry: string | null
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          payment_no: string | null
          provider_payment_id: string | null
          provider_status: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_khr?: number
          amount_usd: number
          bank_ref?: string | null
          checkout_url?: string | null
          created_at?: string
          credit_due_at?: string | null
          customer_id: string
          id?: string
          khqr_code?: string | null
          khqr_expiry?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          payment_no?: string | null
          provider_payment_id?: string | null
          provider_status?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_khr?: number
          amount_usd?: number
          bank_ref?: string | null
          checkout_url?: string | null
          created_at?: string
          credit_due_at?: string | null
          customer_id?: string
          id?: string
          khqr_code?: string | null
          khqr_expiry?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          payment_no?: string | null
          provider_payment_id?: string | null
          provider_status?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_accounts: {
        Row: {
          created_at: string
          phone: string
          user_id: string
        }
        Insert: {
          created_at?: string
          phone: string
          user_id: string
        }
        Update: {
          created_at?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      pos_sale_items: {
        Row: {
          id: string
          line_total_usd: number
          product_id: string
          qty: number
          sale_id: string
          unit_price_usd: number
        }
        Insert: {
          id?: string
          line_total_usd: number
          product_id: string
          qty: number
          sale_id: string
          unit_price_usd: number
        }
        Update: {
          id?: string
          line_total_usd?: number
          product_id?: string
          qty?: number
          sale_id?: string
          unit_price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales: {
        Row: {
          created_at: string
          id: string
          note: string | null
          payment_method: string
          sale_no: string | null
          staff_id: string | null
          total_usd: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          payment_method: string
          sale_no?: string | null
          staff_id?: string | null
          total_usd: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          payment_method?: string
          sale_no?: string | null
          staff_id?: string | null
          total_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          id: string
          price_usd: number
          product_id: string
          qty_max: number | null
          qty_min: number
        }
        Insert: {
          id?: string
          price_usd: number
          product_id: string
          qty_max?: number | null
          qty_min: number
        }
        Update: {
          id?: string
          price_usd?: number
          product_id?: string
          qty_max?: number | null
          qty_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          product_id: string
          rating: number
          reviewer_name: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          product_id: string
          rating: number
          reviewer_name?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
          rating?: number
          reviewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          cost_usd: number
          created_at: string
          description: Json
          id: string
          name_en: string
          name_km: string
          photo_url: string | null
          reorder_threshold: number
          sku: string
          stock_qty: number
          unit: string
          unit_km: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          cost_usd?: number
          created_at?: string
          description?: Json
          id?: string
          name_en: string
          name_km: string
          photo_url?: string | null
          reorder_threshold?: number
          sku: string
          stock_qty?: number
          unit: string
          unit_km: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          cost_usd?: number
          created_at?: string
          description?: Json
          id?: string
          name_en?: string
          name_km?: string
          photo_url?: string | null
          reorder_threshold?: number
          sku?: string
          stock_qty?: number
          unit?: string
          unit_km?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          business_address: string | null
          business_lat: number | null
          business_lng: number | null
          business_name: string | null
          created_at: string
          credit_limit_usd: number | null
          credit_terms_days: number | null
          id: string
          name: string
          phone: string
          telegram: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_address?: string | null
          business_lat?: number | null
          business_lng?: number | null
          business_name?: string | null
          created_at?: string
          credit_limit_usd?: number | null
          credit_terms_days?: number | null
          id: string
          name?: string
          phone?: string
          telegram?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_address?: string | null
          business_lat?: number | null
          business_lng?: number | null
          business_name?: string | null
          created_at?: string
          credit_limit_usd?: number | null
          credit_terms_days?: number | null
          id?: string
          name?: string
          phone?: string
          telegram?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          max_uses: number | null
          min_order_usd: number
          starts_at: string | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_usd?: number
          starts_at?: string | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_usd?: number
          starts_at?: string | null
          used_count?: number
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          cost_usd: number
          id: string
          po_id: string
          product_id: string
          qty: number
        }
        Insert: {
          cost_usd?: number
          id?: string
          po_id: string
          product_id: string
          qty: number
        }
        Update: {
          cost_usd?: number
          id?: string
          po_id?: string
          product_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          po_no: string | null
          received_at: string | null
          status: string
          supplier_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          po_no?: string | null
          received_at?: string | null
          status?: string
          supplier_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          po_no?: string | null
          received_at?: string | null
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      request_images: {
        Row: {
          id: string
          request_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          id?: string
          request_id: string
          sort_order: number
          storage_path: string
        }
        Update: {
          id?: string
          request_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_images_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "customer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_messages: {
        Row: {
          amount_usd: number | null
          body: string
          created_at: string
          id: string
          is_staff: boolean
          offer_status: string | null
          request_id: string
          sender_id: string
        }
        Insert: {
          amount_usd?: number | null
          body: string
          created_at?: string
          id?: string
          is_staff: boolean
          offer_status?: string | null
          request_id: string
          sender_id: string
        }
        Update: {
          amount_usd?: number | null
          body?: string
          created_at?: string
          id?: string
          is_staff?: boolean
          offer_status?: string | null
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "customer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_media: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          review_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          review_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          review_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_media_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          id: string
          section: string
          user_id: string
        }
        Insert: {
          id?: string
          section: string
          user_id: string
        }
        Update: {
          id?: string
          section?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string | null
          product_id: string
          qty: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          note?: string | null
          product_id: string
          qty: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          product_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          note: string | null
          phone: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_category: { Args: { _id: string }; Returns: undefined }
      admin_delete_promo: { Args: { _id: string }; Returns: undefined }
      admin_upsert_category: {
        Args: {
          _active: boolean
          _icon: string
          _id: string
          _name_en: string
          _name_km: string
          _slug: string
          _sort_order: number
        }
        Returns: string
      }
      admin_upsert_promo: {
        Args: {
          _active: boolean
          _code: string
          _discount_type: string
          _discount_value: number
          _ends_at: string
          _id: string
          _max_uses: number
          _min_order_usd: number
          _starts_at: string
        }
        Returns: string
      }
      apply_external_payment_status: {
        Args: {
          _bank_ref?: string
          _provider_payment_id: string
          _provider_status: string
        }
        Returns: undefined
      }
      attribute_order_banner: {
        Args: { _banner_id: string; _order_id: string }
        Returns: undefined
      }
      banner_stats: {
        Args: never
        Returns: {
          banner_id: string
          clicks: number
          completed: number
          orders: number
          revenue: number
          title: string
          unique_users: number
        }[]
      }
      bind_external_payment: {
        Args: {
          _expires_at: string
          _payment_id: string
          _provider_payment_id: string
          _qr_code: string
        }
        Returns: undefined
      }
      buyer_update_order: {
        Args: {
          _delivery_address: string
          _lat: number
          _lng: number
          _order_id: string
          _payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: undefined
      }
      can_access: {
        Args: { _section: string; _user_id: string }
        Returns: boolean
      }
      confirm_payment: {
        Args: { _bank_ref?: string; _payment_id: string }
        Returns: undefined
      }
      create_db_backup: { Args: never; Returns: string }
      customer_credit_used: { Args: { _customer_id: string }; Returns: number }
      decide_request_offer: {
        Args: { _accept: boolean; _message_id: string; _request_id: string }
        Returns: undefined
      }
      expire_unpaid_orders: { Args: never; Returns: number }
      get_min_order: { Args: never; Returns: number }
      get_storefront_info: { Args: never; Returns: Json }
      get_wholesale_info: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_public_photo: { Args: { _name: string }; Returns: boolean }
      place_order: {
        Args: {
          _delivery_address: string
          _exchange_rate: number
          _items: Json
          _note: string
          _payment_method: Database["public"]["Enums"]["payment_method"]
          _promo_code?: string
        }
        Returns: Json
      }
      pos_checkout: {
        Args: { _items: Json; _note?: string; _payment_method: string }
        Returns: Json
      }
      receive_purchase_order: { Args: { _po_id: string }; Returns: undefined }
      record_stock_movement: {
        Args: {
          _kind: string
          _note?: string
          _product_id: string
          _qty: number
        }
        Returns: string
      }
      reply_customer_request: {
        Args: { _amount?: number; _body: string; _id: string }
        Returns: string
      }
      reserve_order_stock: { Args: { _order_id: string }; Returns: undefined }
      send_alert: { Args: { _kind: string; _text: string }; Returns: undefined }
      set_min_order: { Args: { _amount: number }; Returns: undefined }
      set_order_location: {
        Args: { _lat: number; _lng: number; _order_id: string }
        Returns: undefined
      }
      set_shipping_info: { Args: { _text: string }; Returns: undefined }
      set_staff_access: {
        Args: { _sections: string[]; _staff: boolean; _user_id: string }
        Returns: undefined
      }
      simulate_khqr_payment: {
        Args: { _payment_id: string }
        Returns: undefined
      }
      staff_create_order: {
        Args: {
          _customer: string
          _delivery_address: string
          _items: Json
          _note: string
          _payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: Json
      }
      submit_customer_request: {
        Args: {
          _details: string
          _id: string
          _images: string[]
          _kind: string
          _subject: string
        }
        Returns: string
      }
      test_alert: { Args: never; Returns: undefined }
      validate_promo: {
        Args: { _code: string; _subtotal: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "customer" | "staff" | "owner"
      order_status:
        | "pending"
        | "paid"
        | "picking"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_method: "khqr" | "net30" | "cod" | "link"
      payment_status: "pending" | "paid" | "failed" | "expired"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["customer", "staff", "owner"],
      order_status: [
        "pending",
        "paid",
        "picking",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_method: ["khqr", "net30", "cod", "link"],
      payment_status: ["pending", "paid", "failed", "expired"],
    },
  },
} as const
