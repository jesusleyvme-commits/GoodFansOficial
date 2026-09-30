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
          /** Mostra a marca da GoodFans no topo da página. */
          show_logo: boolean;
          /** Cada campo ligado aparece no formulário e passa a ser obrigatório. */
          collect_name: boolean;
          collect_email: boolean;
          collect_phone: boolean;
          /** Textos do gate. null usa o padrão do app. */
          gate_headline: string | null;
          gate_subhead: string | null;
          privacy_note: string | null;
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
          show_logo?: boolean;
          collect_name?: boolean;
          collect_email?: boolean;
          collect_phone?: boolean;
          gate_headline?: string | null;
          gate_subhead?: string | null;
          privacy_note?: string | null;
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
          show_logo?: boolean;
          collect_name?: boolean;
          collect_email?: boolean;
          collect_phone?: boolean;
          gate_headline?: string | null;
          gate_subhead?: string | null;
          privacy_note?: string | null;
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
      gate_submissions: {
        Row: {
          id: string;
          link_id: string;
          model_id: string;
          /** PII cifrada. Só sai do banco por `list_submissions`, para o dono. */
          name_encrypted: string | null;
          email_encrypted: string | null;
          phone_encrypted: string | null;
          /** SHA-256, para casar com a Meta sem mandar o valor em claro. */
          email_hash: string | null;
          phone_hash: string | null;
          first_name_hash: string | null;
          last_name_hash: string | null;
          event_id: string | null;
          /** Quando o visitante marcou o aceite. A linha só existe se marcou. */
          consented_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          link_id: string;
          model_id: string;
          name_encrypted?: string | null;
          email_encrypted?: string | null;
          phone_encrypted?: string | null;
          email_hash?: string | null;
          phone_hash?: string | null;
          first_name_hash?: string | null;
          last_name_hash?: string | null;
          event_id?: string | null;
          consented_at?: string;
          created_at?: string;
        };
        Update: Record<never, never>;
        Relationships: [
          {
            foreignKeyName: "gate_submissions_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: false;
            referencedRelation: "delivery_links";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_details: {
        Row: {
          user_id: string;
          /** Cifrados. Sem privilégio de SELECT: só as RPCs abaixo. */
          holder_name_encrypted: string | null;
          iban_encrypted: string | null;
          pix_key_encrypted: string | null;
          mbway_phone_encrypted: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<never, never>;
        Update: Record<never, never>;
        Relationships: [
          {
            foreignKeyName: "payout_details_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
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
          show_logo: boolean;
          collect_name: boolean;
          collect_email: boolean;
          collect_phone: boolean;
          gate_headline: string | null;
          gate_subhead: string | null;
          privacy_note: string | null;
        }[];
      };
      /**
       * Grava a coleta antes de liberar o acesso. Vale só o que o link pede, e
       * `p_consent` precisa vir marcado: é o que a LGPD chama de consentimento
       * livre, e a função devolve false em vez de gravar quando falta.
       */
      submit_gate: {
        Args: {
          p_link_id: string;
          p_name: string | null;
          p_email: string | null;
          p_phone: string | null;
          p_event_id: string;
          p_consent: boolean;
        };
        Returns: boolean;
      };
      /** Ajusta o gate do link. A posse é conferida no banco com auth.uid(). */
      update_link_gate: {
        Args: {
          p_link_id: string;
          p_show_logo: boolean;
          p_collect_name: boolean;
          p_collect_email: boolean;
          p_collect_phone: boolean;
          p_headline: string | null;
          p_subhead: string | null;
          p_privacy_note: string | null;
        };
        Returns: boolean;
      };
      /**
       * Lista o que foi coletado nos links do creator, com o PII em claro. Só
       * ele mesmo, conferido por RLS — e é a única forma de ler isso, já que as
       * funções de decifragem são inacessíveis ao anon.
       */
      list_submissions: {
        Args: { p_link_id: string };
        Returns: {
          id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
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
      /**
       * Grava IBAN, chave PIX e telefone MBway cifrados. Campo vazio limpa, e o
       * banco recusa formato inválido antes de gravar.
       */
      save_payout_details: {
        Args: {
          p_holder_name?: string | null;
          p_iban?: string | null;
          p_pix_key?: string | null;
          p_mbway_phone?: string | null;
        };
        Returns: boolean;
      };
      /** Lê os dados de recebimento em claro, só da própria linha. */
      reveal_payout_details: {
        Args: Record<PropertyKey, never>;
        Returns: {
          holder_name: string | null;
          iban: string | null;
          pix_key: string | null;
          mbway_phone: string | null;
          updated_at: string;
        }[];
      };
      /**
       * Conversões, envios à Meta e coletas por link. Só do creator: a posse é
       * conferida com auth.uid() dentro da função. Receita não vem aqui — é
       * contagem × o valor que o creator configurou no link.
       */
      finance_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          link_id: string;
          model_id: string;
          product_name: string;
          value_eur: number | null;
          conversions: number;
          sent_to_meta: number;
          leads: number;
          first_conversion_at: string | null;
          last_conversion_at: string | null;
        }[];
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
