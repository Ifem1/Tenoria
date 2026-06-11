"use client";
import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type B = ButtonHTMLAttributes<HTMLButtonElement>;

export function MediatorButton({ className, children, ...p }: B) {
  return <button className={clsx("btn-primary", className)} {...p}>│ {children}</button>;
}
export function PrivateFolderTab({ className, children, ...p }: B) {
  return <button className={clsx("btn-secondary", className)} {...p}>{children}</button>;
}
export function KeeperButton({ className, children, ...p }: B) {
  return <button className={clsx("btn-keeper", className)} {...p}>✓ {children}</button>;
}
export function EvidenceButton({ className, children, ...p }: B) {
  return <button className={clsx("btn-evidence", className)} {...p}>{children}</button>;
}
export function AppealButton({ className, children, ...p }: B) {
  return <button className={clsx("btn-appeal", className)} {...p}>{children}</button>;
}
