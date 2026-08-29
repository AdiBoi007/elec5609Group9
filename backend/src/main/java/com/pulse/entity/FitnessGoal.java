package com.pulse.entity;

/**
 * Canonical fitness goal domain enum. The product displays labels such as
 * "Build muscle" / "Lose weight" / "Maintain", but storage, transport and the
 * calorie calculation all use these stable enum constants.
 */
public enum FitnessGoal {
    CUT("Lose weight", -400),
    MAINTAIN("Maintain", 0),
    BULK("Build muscle", 250);

    private final String label;
    /** Calorie delta applied on top of TDEE for this goal. */
    public final int calorieAdjustment;

    FitnessGoal(String label, int calorieAdjustment) {
        this.label = label;
        this.calorieAdjustment = calorieAdjustment;
    }

    public String label() {
        return label;
    }

    /**
     * Parse an enum name or a legacy/display string ("Build muscle", "build_muscle",
     * "gain weight", ...) into a canonical goal. Returns {@code null} for null, blank
     * or unrecognised input.
     */
    public static FitnessGoal from(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String v = raw.trim().toLowerCase().replace(' ', '_');
        return switch (v) {
            case "cut", "lose_weight", "lose", "weight_loss" -> CUT;
            case "bulk", "build_muscle", "gain_weight", "gain_muscle", "muscle_gain" -> BULK;
            case "maintain", "maintenance" -> MAINTAIN;
            default -> null;
        };
    }
}
