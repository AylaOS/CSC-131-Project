//team: Hello World
//this file allows the frontend JavaScript communicate directly with the Supabase
//database and authetnication services

import { createClient} from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://xwzjokwjhadsliuoufpu.supabase.co"
const supabaseKey = "sb_publishable_1cdPK9k5b5eTuXDQ27Qg5g_3sit3svN"

export const supabase = createClient(supabaseUrl, supabaseKey);