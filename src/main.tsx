import { createRoot } from "react-dom/client";

console.log('Connected Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
import { supabase } from "@/integrations/supabase/client";

supabase.from("test").select("*").then(({ data, error }) => {
  console.log("Supabase test:", { data, error });
});