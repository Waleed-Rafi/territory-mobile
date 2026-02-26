import React from "react";
import { ViewStyle } from "react-native";
import { Spinner } from "./Spinner";
import { Dots } from "./Dots";
import { Skeleton } from "./Skeleton";
import { ProgressBar } from "./ProgressBar";

export type LoaderType = "spinner" | "spinnerLarge" | "dots" | "skeleton" | "progress";

export interface LoaderProps {
  type: LoaderType;
  /** For type "progress": 0–1 */
  progress?: number;
  color?: string;
  style?: ViewStyle;
}

export function Loader({ type, progress = 0, color, style }: LoaderProps) {
  switch (type) {
    case "spinner":
      return <Spinner color={color} style={style} />;
    case "spinnerLarge":
      return <Spinner size="large" color={color} style={style} />;
    case "dots":
      return <Dots color={color} style={style} />;
    case "skeleton":
      return <Skeleton style={style} />;
    case "progress":
      return <ProgressBar progress={progress} fillColor={color} style={style} />;
    default:
      return <Spinner color={color} style={style} />;
  }
}

export { Spinner, Dots, Skeleton, ProgressBar };
