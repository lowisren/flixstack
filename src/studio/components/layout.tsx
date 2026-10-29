"use client";

// Layout: containers that hold other components through a `children` slot.
// Spacing and widths come from the design system's own scales, offered as choices,
// so authors arrange content without typing raw sizes.

import { Grid, PageShell, Panel, Row, Stack } from "@/design-system";
import type { ContainerWidth, GridColumns, LayoutGap, PanelProps, RowProps, StackProps } from "@/design-system";
import { cn } from "@/lib/utils";
import { choice, type StudioAttributes } from "../props";

type Choice<T extends string> = T | T[];

interface SlotProps extends StudioAttributes {
  children?: React.ReactNode;
}

export interface StudioStackProps extends SlotProps {
  gap?: Choice<LayoutGap>;
  align?: Choice<NonNullable<StackProps["align"]>>;
}

export function StudioStack({ children, gap, align, studioAttributes }: StudioStackProps) {
  return (
    <Stack gap={choice(gap, "sm")} align={choice(align, "stretch")} {...studioAttributes}>
      {children}
    </Stack>
  );
}

export interface StudioRowProps extends SlotProps {
  gap?: Choice<LayoutGap>;
  align?: Choice<NonNullable<RowProps["align"]>>;
  justify?: Choice<NonNullable<RowProps["justify"]>>;
  wrap?: boolean;
  collapse?: boolean;
  reverse?: boolean;
}

export function StudioRow({ children, gap, align, justify, wrap = false, collapse = false, reverse = false, studioAttributes }: StudioRowProps) {
  return (
    <Row
      gap={choice(gap, "sm")}
      align={choice(align, "center")}
      justify={choice(justify, "start")}
      wrap={wrap}
      collapse={collapse}
      reverse={reverse}
      // Children of a collapsing row share the width equally once side by side.
      className={collapse ? "md:*:flex-1" : undefined}
      {...studioAttributes}
    >
      {children}
    </Row>
  );
}

export interface StudioGridProps extends SlotProps {
  columns?: Choice<GridColumns>;
  gap?: Choice<LayoutGap>;
}

export function StudioGrid({ children, columns, gap, studioAttributes }: StudioGridProps) {
  return (
    <Grid columns={choice(columns, "3")} gap={choice(gap, "md")} {...studioAttributes}>
      {children}
    </Grid>
  );
}

const shellPadding = { none: "py-0", sm: "py-6", md: "py-10", lg: "py-16" };

export interface StudioSectionShellProps extends SlotProps {
  width?: Choice<ContainerWidth | "full">;
  padding?: Choice<keyof typeof shellPadding>;
}

/**
 * The outer wrapper for a page section: the page's max width and gutter (so the
 * content lines up with the header and footer) plus vertical rhythm. `full` is
 * edge to edge, for sections that bleed (a hero carousel, a rail).
 */
export function StudioSectionShell({ children, width, padding, studioAttributes }: StudioSectionShellProps) {
  const w = choice(width, "wide");
  const p = shellPadding[choice(padding, "md")];
  if (w === "full") {
    return (
      <section className={cn("w-full", p)} {...studioAttributes}>
        {children}
      </section>
    );
  }
  return (
    <section {...studioAttributes}>
      <PageShell width={w} className={p}>
        {children}
      </PageShell>
    </section>
  );
}

export interface StudioPanelProps extends SlotProps {
  padding?: Choice<NonNullable<PanelProps["padding"]>>;
  border?: Choice<NonNullable<PanelProps["border"]>>;
  scanlines?: boolean;
}

/** The notched surface container used for cards and callouts. */
export function StudioPanel({ children, padding, border, scanlines = false, studioAttributes }: StudioPanelProps) {
  return (
    <Panel padding={choice(padding, "md")} border={choice(border, "divider")} scanlines={scanlines} {...studioAttributes}>
      {children}
    </Panel>
  );
}
