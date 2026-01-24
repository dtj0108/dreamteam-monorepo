import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/session"

// GET - Fetch all custom field values for an entity
// Query params: entity_id, entity_type (optional, defaults to 'lead')
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get("entity_id")
    const entityType = searchParams.get("entity_type") || "lead"

    if (!entityId) {
      return NextResponse.json({ error: "entity_id is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get all custom fields for this entity type
    const { data: fields, error: fieldsError } = await supabase
      .from("custom_fields")
      .select("*")
      .eq("user_id", session.id)
      .eq("entity_type", entityType)
      .order("position", { ascending: true })

    if (fieldsError) {
      console.error("Error fetching custom fields:", fieldsError)
      return NextResponse.json({ error: fieldsError.message }, { status: 500 })
    }

    if (!fields || fields.length === 0) {
      return NextResponse.json([])
    }

    // Get values for this entity
    const fieldIds = fields.map((f: { id: string }) => f.id)
    const { data: values, error: valuesError } = await supabase
      .from("custom_field_values")
      .select("*")
      .eq("entity_id", entityId)
      .in("custom_field_id", fieldIds)

    if (valuesError) {
      console.error("Error fetching custom field values:", valuesError)
      return NextResponse.json({ error: valuesError.message }, { status: 500 })
    }

    // Merge fields with their values
    type FieldValue = { custom_field_id: string; value: string | null }
    const fieldsWithValues = fields.map((field: { id: string }) => ({
      ...field,
      value: values?.find((v: FieldValue) => v.custom_field_id === field.id)?.value ?? null,
    }))

    return NextResponse.json(fieldsWithValues)
  } catch (error) {
    console.error("Error in custom field values GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Bulk upsert custom field values for an entity
// Body: { entity_id: string, values: { [custom_field_id]: value } }
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { entity_id, values } = body

    if (!entity_id || !values) {
      return NextResponse.json({ error: "entity_id and values are required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify user owns these custom fields
    const fieldIds = Object.keys(values)
    if (fieldIds.length === 0) {
      return NextResponse.json({ success: true })
    }

    const { data: ownedFields } = await supabase
      .from("custom_fields")
      .select("id")
      .eq("user_id", session.id)
      .in("id", fieldIds)

    const ownedFieldIds = new Set(ownedFields?.map((f: { id: string }) => f.id) || [])

    // Prepare upserts for owned fields only
    const upserts = fieldIds
      .filter((fieldId) => ownedFieldIds.has(fieldId))
      .map((custom_field_id) => ({
        custom_field_id,
        entity_id,
        value: values[custom_field_id]?.toString() ?? null,
      }))

    if (upserts.length > 0) {
      const { error } = await supabase
        .from("custom_field_values")
        .upsert(upserts, { onConflict: "custom_field_id,entity_id" })

      if (error) {
        console.error("Error upserting custom field values:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in custom field values POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
