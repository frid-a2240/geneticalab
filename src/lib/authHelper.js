// src/lib/authHelper.js
import bcrypt from "bcryptjs";
import { supabase } from "./supabaseClient.js";

const SESSION_KEY = "genetica_session";
const SESSION_DURATION_HOURS = 8;

/**
 * Genera un token aleatorio para la sesión
 */
function generateToken() {
  return crypto.randomUUID() + "-" + Date.now();
}

/**
 * Intenta loguear al usuario con id y password
 * Retorna { success, user, error }
 */
export async function login(empId, password) {
  try {
    // 1. Buscar usuario
    const { data: usuario, error: userErr } = await supabase
      .from("usuarios")
      .select("id, nombre, password_hash, activado")
      .eq("id", empId.trim())
      .maybeSingle();

    if (userErr) {
      console.error("Error al buscar usuario:", userErr);
      return { success: false, error: "Error de conexión. Intenta de nuevo." };
    }

    if (!usuario) {
      return { success: false, error: "Número de empleado no encontrado." };
    }

    if (!usuario.activado) {
      return { success: false, error: "Tu cuenta no está activada. Contacta a RH." };
    }

    // 2. Verificar password
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return { success: false, error: "Contraseña incorrecta." };
    }

    // 3. Crear sesión
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

    const { error: sessErr } = await supabase
      .from("sesiones")
      .insert({
        token,
        id: usuario.id,
        nombre: usuario.nombre,
        expires_at: expiresAt.toISOString(),
      });

    if (sessErr) {
      console.error("Error al crear sesión:", sessErr);
      return { success: false, error: "Error al iniciar sesión." };
    }

    // 4. Guardar en localStorage
    const session = {
      token,
      id: usuario.id,
      nombre: usuario.nombre,
      expires_at: expiresAt.toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { success: true, user: session };
  } catch (err) {
    console.error("Error en login:", err);
    return { success: false, error: "Error inesperado. Intenta de nuevo." };
  }
}

/**
 * Cierra sesión: borra el token de Supabase y localStorage
 */
export async function logout() {
  const session = getStoredSession();
  if (session?.token) {
    await supabase.from("sesiones").delete().eq("token", session.token);
  }
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Lee la sesión del localStorage (sin validar contra Supabase)
 */
export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Valida la sesión contra Supabase. Retorna user o null.
 * Si la sesión venció, la borra automáticamente.
 */
export async function validateSession() {
  const stored = getStoredSession();
  if (!stored?.token) return null;

  // Check expiración local primero (rápido)
  if (new Date(stored.expires_at) < new Date()) {
    await logout();
    return null;
  }

  // Validar contra Supabase
  const { data, error } = await supabase
    .from("sesiones")
    .select("token, id, nombre, expires_at")
    .eq("token", stored.token)
    .maybeSingle();

  if (error || !data) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  if (new Date(data.expires_at) < new Date()) {
    await supabase.from("sesiones").delete().eq("token", stored.token);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  return data;
}