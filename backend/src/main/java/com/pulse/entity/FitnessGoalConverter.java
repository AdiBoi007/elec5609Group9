package com.pulse.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Persists {@link FitnessGoal} as its canonical name (BULK/CUT/MAINTAIN) while still
 * reading legacy display strings ("Build muscle", ...) written before the enum existed,
 * so no data migration is required under Hibernate ddl-auto=update.
 */
@Converter
public class FitnessGoalConverter implements AttributeConverter<FitnessGoal, String> {
    @Override
    public String convertToDatabaseColumn(FitnessGoal goal) {
        return goal == null ? null : goal.name();
    }

    @Override
    public FitnessGoal convertToEntityAttribute(String value) {
        return FitnessGoal.from(value);
    }
}
