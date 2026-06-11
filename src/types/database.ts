export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          country_code: string | null;
          total_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "total_points" | "created_at" | "updated_at"> & {
          total_points?: number;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      matches: {
        Row: {
          id: string;
          home_team: string;
          away_team: string;
          home_team_code: string;
          away_team_code: string;
          home_score: number | null;
          away_score: number | null;
          kickoff_at: string;
          stage: "group" | "round_of_32" | "round_of_16" | "quarter_final" | "semi_final" | "third_place" | "final";
          group_name: string | null;
          venue: string | null;
          status: "upcoming" | "live" | "finished";
          predictions_locked_at: string | null;
          api_football_id: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["matches"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
      };
      score_predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          home_score: number;
          away_score: number;
          points_awarded: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["score_predictions"]["Row"], "id" | "points_awarded" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["score_predictions"]["Row"], "home_score" | "away_score">>;
      };
      lineup_predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          team_code: string;
          players: Json;
          formation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lineup_predictions"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["lineup_predictions"]["Row"], "players" | "formation">>;
      };
      player_ratings: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          player_name: string;
          team_code: string;
          rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["player_ratings"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["player_ratings"]["Row"], "rating">>;
      };
      potg_votes: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          player_name: string;
          team_code: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["potg_votes"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["potg_votes"]["Row"], "player_name" | "team_code">>;
      };
      chat_messages: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          content: string;
          is_deleted: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chat_messages"]["Row"], "id" | "is_deleted" | "created_at"> & { id?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["chat_messages"]["Row"], "is_deleted">>;
      };
      bracket_predictions: {
        Row: {
          id: string;
          user_id: string;
          bracket: Json;
          points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bracket_predictions"]["Row"], "id" | "points" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["bracket_predictions"]["Row"], "bracket">>;
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          owner_id: string;
          description: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: { id?: string; name: string; owner_id: string; invite_code?: string; description?: string | null; is_public?: boolean };
        Update: Partial<Pick<Database["public"]["Tables"]["leagues"]["Row"], "name" | "description" | "is_public">>;
      };
      league_members: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["league_members"]["Row"], "id" | "joined_at"> & { id?: string };
        Update: never;
      };
      confirmed_lineups: {
        Row: {
          id: string;
          match_id: string;
          team_code: string;
          team_name: string;
          formation: string | null;
          start_xi: Json;
          substitutes: Json;
          coach: string | null;
          fetched_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["confirmed_lineups"]["Row"], "id" | "fetched_at"> & { id?: string; fetched_at?: string };
        Update: Partial<Omit<Database["public"]["Tables"]["confirmed_lineups"]["Insert"], "match_id" | "team_code">>;
      };
    };
    Views: {
      leaderboard: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          country_code: string | null;
          total_points: number;
          rank: number;
        };
      };
    };
  };
}

// Convenience aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type ScorePrediction = Database["public"]["Tables"]["score_predictions"]["Row"];
export type LineupPrediction = Database["public"]["Tables"]["lineup_predictions"]["Row"];
export type PlayerRating = Database["public"]["Tables"]["player_ratings"]["Row"];
export type PotgVote = Database["public"]["Tables"]["potg_votes"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type BracketPrediction = Database["public"]["Tables"]["bracket_predictions"]["Row"];
export type League = Database["public"]["Tables"]["leagues"]["Row"];
export type LeagueMember = Database["public"]["Tables"]["league_members"]["Row"];
export type LeaderboardEntry = Database["public"]["Views"]["leaderboard"]["Row"];
export type ConfirmedLineup = Database["public"]["Tables"]["confirmed_lineups"]["Row"];

export interface LineupPlayer {
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  shirt_number: number;
}

export type MatchStage = Match["stage"];
export type MatchStatus = Match["status"];
