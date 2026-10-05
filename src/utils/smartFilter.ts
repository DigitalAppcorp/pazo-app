export const generateSmartTags = (text: string): string[] => {
    if (!text || typeof text !== 'string') {
        return []
    }

    // Normalizar texto: convertir a minúsculas y remover acentos/diacríticos
    const normalizedText = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const tags: string[] = []

    // Taxonomía MVP controlada y sus palabras clave normalizadas
    const taxonomy: Record<string, string[]> = {
        'Paseos': ['paseo', 'parque', 'caminata', 'correr', 'aire libre', 'plaza'],
        'Alimentación': ['comida', 'croquetas', 'dieta', 'premio', 'snack', 'comer', 'nutricion'],
        'Salud': ['veterinario', 'vacuna', 'doctor', 'salud', 'medicina', 'sintoma', 'bano'],
        'Comunidad': ['amigos', 'reunion', 'juntanza', 'vecindario', 'club', 'evento'],
        'Entrenamiento': ['truco', 'obediencia', 'adiestramiento', 'comando', 'educar'],
        'Accesorios': ['juguete', 'collar', 'correa', 'ropa', 'cama']
    }

    // Evaluar cada categoría del mapa cerrado
    for (const [category, keywords] of Object.entries(taxonomy)) {
        const hasMatch = keywords.some(keyword => normalizedText.includes(keyword))
        if (hasMatch) {
            tags.push(category)
        }
    }

    // Retornar arreglo único sin duplicados (si no hay coincidencias, retorna [])
    return Array.from(new Set(tags))
}
