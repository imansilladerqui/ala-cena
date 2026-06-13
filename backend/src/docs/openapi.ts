export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Ala-cena API',
    version: '1.0.0',
    description: 'API de alacena inteligente y menú diario familiar',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Desarrollo local' }],
  tags: [
    { name: 'Sistema' },
    { name: 'Alacena' },
    { name: 'Menú' },
    { name: 'Perfiles' },
  ],
  components: {
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
        },
        required: ['error'],
      },
      PantryItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string', nullable: true },
          expires_at: { type: 'string', format: 'date', nullable: true },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      ScannedItem: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number', default: 1 },
          unit: { type: 'string', nullable: true },
        },
        required: ['name'],
      },
      Profile: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          restrictions: { type: 'array', items: { type: 'string' } },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      IngredientRef: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          amount: { type: 'number' },
          unit: { type: 'string' },
          image: { type: 'string' },
          original: { type: 'string' },
        },
      },
      IngredientSummary: {
        type: 'object',
        properties: {
          have: { type: 'integer' },
          need: { type: 'integer' },
        },
      },
      MenuProposal: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          image: { type: 'string' },
          usedIngredientCount: { type: 'integer' },
          missedIngredientCount: { type: 'integer' },
          usedIngredients: { type: 'array', items: { $ref: '#/components/schemas/IngredientRef' } },
          missedIngredients: { type: 'array', items: { $ref: '#/components/schemas/IngredientRef' } },
          ingredientSummary: { $ref: '#/components/schemas/IngredientSummary' },
        },
      },
      DeductionPreview: {
        type: 'object',
        properties: {
          pantryId: { type: 'integer' },
          name: { type: 'string' },
          quantityAvailable: { type: 'number' },
          quantityToDeduct: { type: 'number' },
          unit: { type: 'string', nullable: true },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } },
          },
        },
      },
    },
    '/pantry': {
      get: {
        tags: ['Alacena'],
        summary: 'Lista el stock de la alacena',
        responses: {
          '200': {
            description: 'Lista de productos',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PantryItem' } } } },
          },
        },
      },
      post: {
        tags: ['Alacena'],
        summary: 'Añade un producto manualmente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number', default: 1 },
                  unit: { type: 'string' },
                  expires_at: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Producto creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/PantryItem' } } } },
          '400': { description: 'Error de validación', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/pantry/{id}': {
      patch: {
        tags: ['Alacena'],
        summary: 'Actualiza la cantidad de un producto',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['quantity'], properties: { quantity: { type: 'number' } } } } },
        },
        responses: {
          '200': { description: 'Producto actualizado o eliminado si quantity <= 0' },
          '404': { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Alacena'],
        summary: 'Elimina un producto',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Eliminado' },
          '404': { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/pantry/scan': {
      post: {
        tags: ['Alacena'],
        summary: 'Escanea un ticket (OCR)',
        description: 'Envía la imagen en base64 sin prefijo data:image/...',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['imageBase64'],
                properties: { imageBase64: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Productos detectados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    detected: { type: 'array', items: { $ref: '#/components/schemas/ScannedItem' } },
                  },
                },
              },
            },
          },
          '422': { description: 'No se detectó texto', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/pantry/scan/confirm': {
      post: {
        tags: ['Alacena'],
        summary: 'Confirma productos del ticket y los añade a la alacena',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: { type: 'array', items: { $ref: '#/components/schemas/ScannedItem' } },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Productos añadidos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PantryItem' } } } } },
        },
      },
    },
    '/menu/today': {
      get: {
        tags: ['Menú'],
        summary: 'Obtiene las 5 propuestas del día',
        responses: {
          '200': {
            description: 'Propuestas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    proposals: { type: 'array', items: { $ref: '#/components/schemas/MenuProposal' } },
                  },
                },
              },
            },
          },
          '400': { description: 'Alacena vacía', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/menu/choose/preview': {
      post: {
        tags: ['Menú'],
        summary: 'Preview de ingredientes a descontar de la alacena',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['usedIngredients'],
                properties: {
                  recipeId: { type: 'string' },
                  usedIngredients: { type: 'array', items: { $ref: '#/components/schemas/IngredientRef' } },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Descuentos previstos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deductions: { type: 'array', items: { $ref: '#/components/schemas/DeductionPreview' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/menu/choose': {
      post: {
        tags: ['Menú'],
        summary: 'Elige una receta y descuenta ingredientes',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['recipeId', 'recipeTitle', 'ingredients'],
                properties: {
                  recipeId: { type: 'string' },
                  recipeTitle: { type: 'string' },
                  ingredients: { type: 'array', items: { $ref: '#/components/schemas/IngredientRef' } },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Receta registrada' } },
      },
    },
    '/menu/rate': {
      post: {
        tags: ['Menú'],
        summary: 'Puntúa la receta cocinada (1-5)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['recipeId', 'rating'],
                properties: {
                  recipeId: { type: 'string' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Puntuación guardada' },
          '404': { description: 'Sin historial', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/profiles': {
      get: {
        tags: ['Perfiles'],
        summary: 'Lista personas de la casa',
        responses: {
          '200': { description: 'Perfiles', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Profile' } } } } },
        },
      },
      post: {
        tags: ['Perfiles'],
        summary: 'Añade una persona',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  restrictions: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Perfil creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Profile' } } } } },
      },
    },
    '/profiles/{id}': {
      patch: {
        tags: ['Perfiles'],
        summary: 'Actualiza un perfil',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  restrictions: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Perfil actualizado' },
          '404': { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Perfiles'],
        summary: 'Elimina una persona',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Eliminado' },
          '404': { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
}
