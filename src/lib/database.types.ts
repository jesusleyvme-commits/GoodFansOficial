/**
 * Espelho em TypeScript do schema Postgres no projeto Supabase.
 * Regere com a ferramenta `generate_typescript_types` do MCP do Supabase após
 * qualquer migração.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      delivery_links: {
        Row: {
          id: string;
          creator_id: string;
          model_id: string;
          product_name: string;
          destination_url: string;
          /** Sem uso: o pixel é da modelo, não do link. */
          pixel_id: string | null;
          /** Receita do link em euros. null significa "não informar valor". */
          value_eur: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          model_id: string;
          product_name: string;
          destination_url: string;
          pixel_id?: string | null;
          value_eur?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          model_id?: string;
          product_name?: string;
          destination_url?: string;
          pixel_id?: string | null;
          value_eur?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_links_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "models";
            referencedColumns: ["id"];
          },
        ];
      };
      models: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          /** Opcional. Serve de destino padrão para os links da modelo. */
          destination_url: string | null;
          /** Sobrescrita opcional. Só o modelo usa pixel hoje. */
          meta_pixel_id: string | null;
          /** Token do Graph API cifrado. Nunca sai do banco; use as RPCs. */
          meta_token_encrypted: string | null;
          has_meta_token: boolean;
          /** Caminho no bucket `avatars`, não a URL. Vira URL só na hora de exibir. */
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          destination_url?: string | null;
          meta_pixel_id?: string | null;
          meta_token_encrypted?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          destination_url?: string | null;
          meta_pixel_id?: string | null;
          meta_token_encrypted?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          /** Nome de exibição. O login é por e-mail, então isto é só o rótulo. */
          username: string | null;
          display_name: string | null;
          /** Caminho no bucket `avatars`, não a URL. Vira URL só na hora de exibir. */
          avatar_path: string | null;
          meta_pixel_id: string | null;
          /** Token do Graph API cifrado. Nunca sai do banco; use as RPCs. */
          meta_token_encrypted: string | null;
          has_meta_token: boolean;
          /** Administrador: aprova contas e vê a lista de pessoas. */
          is_admin: boolean;
          /** Aprovado em. Nulo = aguardando aprovação, e não cria nada. */
          approved_at: string | null;
          /** Desativado em. Com `approved_at` preenchido, marca quem já foi aprovado e hoje está inativo. */
          deactivated_at: string | null;
          /** Recusado em. Nulo = não recusado. Recusada não entra. */
          rejected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_path?: string | null;
          meta_pixel_id?: string | null;
          meta_token_encrypted?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_path?: string | null;
          meta_pixel_id?: string | null;
          meta_token_encrypted?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      resolve_delivery_link: {
        Args: { p_id: string };
        Returns: {
          product_name: string;
          destination_url: string;
          pixel_id: string | null;
          value_eur: number | null;
        }[];
      };
      /** Grava o token cifrado e devolve só se ficou configurado. */
      set_profile_meta_token: {
        Args: { p_token: string };
        Returns: boolean;
      };
      /** Lê o token em claro. A posse é conferida no banco com auth.uid(). */
      reveal_model_meta_token: {
        Args: { p_model_id: string };
        Returns: string | null;
      };
      set_model_meta_token: {
        Args: { p_model_id: string; p_token: string };
        Returns: boolean;
      };
      /** Grava o nome de exibição do usuário. */
      set_account_username: {
        Args: { p_username: string };
        Returns: boolean;
      };
      /**
       * Leitura crua do ciphertext, sem checar de quem é. Só o dono do schema
       * chama, e só `reveal_model_meta_token` faz isso.
       */
      decrypt_meta_token: {
        Args: { p_cipher: string };
        Returns: string | null;
      };
      /**
       * Enfileira a conversão de servidor da entrega. O token é lido e usado
       * dentro do banco: quem chama recebe só se o evento foi enfileirado.
       */
      track_delivery_conversion: {
        Args: {
          p_link_id: string;
          p_event_id: string;
          p_client_ip: string | null;
          p_user_agent: string | null;
          p_source_url: string | null;
        };
        Returns: boolean;
      };
      /** Administrador da instância. Lido no banco para o menu confiar nele. */
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      /**
       * Lista de pessoas para o painel do administrador. Devolve identificação,
       * situação e contagens — nunca pixel nem token de ninguém.
       */
      list_people: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          username: string | null;
          display_name: string | null;
          email: string | null;
          created_at: string;
          approved_at: string | null;
          deactivated_at: string | null;
          rejected_at: string | null;
          is_admin: boolean;
          model_count: number;
          link_count: number;
        }[];
      };
      /** Aprova ou revoga o acesso de uma pessoa. Só o administrador. */
      set_person_approval: {
        Args: { p_user_id: string; p_approved: boolean };
        Returns: boolean;
      };
      /**
       * Recusa ou desfaz a recusa. Função separada de propósito: quem recusa
       * não precisa lembrar de mandar "desaprovar" junto.
       */
      set_person_rejection: {
        Args: { p_user_id: string; p_rejected: boolean };
        Returns: boolean;
      };
      /** Desativa ou reativa. Quem nunca foi aprovado não pode ser reativado. */
      set_person_activation: {
        Args: { p_user_id: string; p_active: boolean };
        Returns: boolean;
      };
      /** Apaga a conta inteira, em cascata. Sem volta. */
      delete_person: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      /** Verdadeiro quando a pessoa pode usar o painel. */
      can_use_panel: {
        Args: { p_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

/**
 * Duas colunas ficam de fora do tipo do app, por motivos diferentes:
 * `meta_token_encrypted` é a credencial cifrada, que nenhuma query do navegador
 * precisa, e `pixel_id` do link é resíduo de uma sobrescrita que foi removida,
 * já que o pixel é da modelo. As duas continuam existindo no Postgres, e por
 * isso o espelho acima continua completo.
 */
export type DeliveryLink = Omit<Database["public"]["Tables"]["delivery_links"]["Row"], "pixel_id">;
export type Model = Omit<Database["public"]["Tables"]["models"]["Row"], "meta_token_encrypted">;
export type Profile = Omit<Database["public"]["Tables"]["profiles"]["Row"], "meta_token_encrypted">;
export type ResolvedDeliveryLink =
  Database["public"]["Functions"]["resolve_delivery_link"]["Returns"][number];
