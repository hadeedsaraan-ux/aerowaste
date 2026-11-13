# AeroWaste System Specification & Steering

## Project Overview
AeroWaste is an autonomous circular economy and planetary geo-engineering engine. It unifies street-level gamified waste collection, high-yield plastic-to-energy conversion, direct atmospheric carbon capture, and deep-space orbital waste ejection towards Venus.

## Core Architecture State Machine
1. **Waste Ingestion (Citizen Node):**
   - Ingestion: Mass (kg) of mixed polymers.
   - Output: Oxygen credits (Liters) + Community Governance tokens.

2. **Refinery & Vitrification:**
   - Conversion: 10 kg Plastic -> 18 kWh High-Yield Electrical Energy.
   - Byproduct Stabilization: Toxic chemical residue solidified into inert high-density vitrified blocks (V-Blocks).
   - Direct Air Capture (DAC): Direct particulate attraction neutralizing airborne soot into solid blocks.

3. **Orbital Ejection Mechanics:**
   - Launch Target: Trans-Venus Injection Trajectory (Hohmann Transfer Orbit).
   - Energy Requirement: 50,000 kWh per ejection payload.
   - Zero-Emission Protocol: Negative-carbon solid fuel boosters with magnetic atmospheric particle traps.

## Kiro Agent Hooks & Validation
- Hook: `on-state-update`: Validates thermodynamic conservation of mass and energy across collection and orbital ejection.
- Spec Target: Browser-based deterministic Canvas engine with zero backend latency.
