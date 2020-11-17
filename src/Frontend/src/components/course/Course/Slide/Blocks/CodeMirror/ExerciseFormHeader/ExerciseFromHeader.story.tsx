import React from "react";
import type { Story } from "@storybook/react";
import { ExerciseFormHeader, ExerciseFormHeaderProps } from "./ExerciseFormHeader";

export default {
	title: 'Exercise/ExerciseFromHeader'
};

const Template: Story<ExerciseFormHeaderProps> = (args) => <ExerciseFormHeader { ...args } />;
