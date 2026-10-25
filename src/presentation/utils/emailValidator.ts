/**
 * Validador estricto para asegurar que los usuarios se registren con correos reales y válidos.
 */
export const validateRealEmail = (rawEmail: string): { valid: boolean; error?: string } => {
  const email = (rawEmail || '').trim().toLowerCase();
  if (!email) {
    return { valid: false, error: 'Por favor ingresa un correo electrónico.' };
  }

  // 1. Sintaxis RFC 5322 básica y TLD de 2 a 12 caracteres alfabéticos
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;
  if (!regex.test(email)) {
    return { 
      valid: false, 
      error: 'Formato de correo no válido. Debe incluir un dominio real (ejemplo: usuario@gmail.com).' 
    };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'El correo contiene múltiples símbolos @.' };
  }

  const [localPart, domain] = parts;

  // 2. Comprobar que el dominio no empiece/termine con punto ni tenga dobles puntos
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..') || localPart.includes('..')) {
    return { valid: false, error: 'El correo no puede tener puntos consecutivos ni terminar en punto.' };
  }

  // 3. Validar TLD (ejemplo .com, .es, .org, .net, .co, .ve)
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { valid: false, error: 'El dominio del correo debe tener una extensión válida (ej: .com).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return { valid: false, error: `La extensión de dominio ".${tld}" no es válida.` };
  }

  // 4. Bloqueo de palabras no permitidas, dominios inventados o temporales
  const blacklistedWords = [
    'puto', 'puta', 'mierda', 'fake', 'falso', 'test', 'tempmail', 
    '10minutemail', 'mailinator', 'guerrillamail', 'asdf', 'prueba'
  ];

  for (const word of blacklistedWords) {
    if (domainParts[0] === word || localPart === word) {
      return { 
        valid: false, 
        error: 'El correo ingresado no parece ser un correo real. Usa tu correo personal o laboral.' 
      };
    }
  }

  return { valid: true };
};
