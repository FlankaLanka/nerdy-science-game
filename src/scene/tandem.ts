import * as THREE from "three";
import { buildTandemModel, TANDEM_WHEEL_RADIUS } from "./tandemModel";
import { BENCH_HEIGHT } from "./benchView";
import { CHAMBERS } from "../chambers";
import type { ChamberId } from "../chambers";
import type { TandemMood } from "../tandemDialogue";
import { PORTALS, roomAt } from "./shipLayout";
import { canWalk } from "./navigation";
import type { Player, Obstacle } from "./navigation";
import { clearGuidePath, guidePath } from "./guideNavigation";
import type { GuidePoint } from "./guideNavigation";

export function buildTandem(scene: THREE.Scene) {
  const { root, body, head, wheel, arm, elbow, eye } = buildTandemModel(scene);
  const down = new THREE.Vector3(0, -1, 0);
  const shoulderPoint = new THREE.Quaternion().setFromUnitVectors(
    down,
    new THREE.Vector3(0.08, 0.12, 0.2).normalize(),
  );
  const shoulderCelebrate = new THREE.Quaternion().setFromUnitVectors(
    down,
    new THREE.Vector3(0.18, 0.8, 0.3).normalize(),
  );
  const shoulderRest = new THREE.Quaternion();
  const elbowRest = new THREE.Quaternion().setFromUnitVectors(
    down,
    new THREE.Vector3(0, -1, 0.12).normalize(),
  );
  const elbowRaised = new THREE.Quaternion();
  const localAim = new THREE.Vector3(),
    aimRotation = new THREE.Quaternion();
  root.visible = false;
  let initialized = false,
    route: GuidePoint[] = [],
    replan = 0,
    lastTarget: GuidePoint = { x: 0, z: 0 },
    yaw = 0;
  let clock = 0,
    lastRoom = -1;
  const position = () => ({ x: root.position.x, z: root.position.z });
  function reset() {
    initialized = false;
    root.visible = false;
    route = [];
    replan = 0;
    lastRoom = -1;
  }
  function parked(index: number) {
    const b = CHAMBERS[index].bench;
    return { x: b.x - 2.25, z: b.z + 0.5 };
  }
  function update(
    dt: number,
    player: Player,
    obstacles: Obstacle[],
    powered: ChamberId[],
    activeBench: number | null,
    preview: boolean,
    paused: boolean,
    reduced: boolean,
    mood: TandemMood,
    pointTarget?: THREE.Vector3,
  ) {
    root.visible = !preview;
    if (preview) return false;
    const room = activeBench ?? roomAt(player.x, player.z);
    if (!initialized) {
      const p = room >= 0 ? parked(room) : { x: player.x - 1.5, z: player.z };
      const candidate = canWalk(p.x, p.z, obstacles)
        ? p
        : positionNear(player, obstacles);
      root.position.set(candidate.x, 0, candidate.z);
      initialized = true;
      lastRoom = room;
    }
    if (paused) return false;
    clock += dt;
    let target: GuidePoint;
    if (room >= 0) {
      target = parked(room);
      if (activeBench === null && powered.includes(CHAMBERS[room].id)) {
        const p = PORTALS[room];
        target = {
          x: p.x + Math.sin(p.rotation) * 2.7 - 1.05 * Math.cos(p.rotation),
          z: p.z + Math.cos(p.rotation) * 2.7 + 1.05 * Math.sin(p.rotation),
        };
      }
    } else {
      const distance = Math.hypot(
        player.x - root.position.x,
        player.z - root.position.z,
      );
      target =
        distance > 2.8
          ? {
              x: player.x + Math.sin(player.yaw) * 2,
              z: player.z + Math.cos(player.yaw) * 2,
            }
          : position();
      if (!canWalk(target.x, target.z, obstacles))
        target = { x: player.x, z: player.z };
    }
    replan -= dt;
    if (
      replan <= 0 ||
      room !== lastRoom ||
      Math.hypot(target.x - lastTarget.x, target.z - lastTarget.z) > 1.5
    ) {
      route = guidePath(position(), target, [
        ...obstacles,
        { x: player.x, z: player.z, radius: 0.5 },
      ]);
      lastTarget = target;
      lastRoom = room;
      replan = 0.9;
    }
    let moved = 0;
    while (
      route.length &&
      Math.hypot(route[0].x - root.position.x, route[0].z - root.position.z) <
        0.12
    )
      route.shift();
    if (route.length) {
      const next = route[0],
        dx = next.x - root.position.x,
        dz = next.z - root.position.z,
        d = Math.hypot(dx, dz);
      const speed =
        Math.hypot(player.x - root.position.x, player.z - root.position.z) > 9
          ? 4.5
          : 2.4;
      moved = Math.min(d, dt * speed);
      const p = {
        x: root.position.x + (dx / d) * moved,
        z: root.position.z + (dz / d) * moved,
      };
      if (
        clearGuidePath(position(), p, obstacles) &&
        Math.hypot(p.x - player.x, p.z - player.z) > 0.8
      ) {
        root.position.x = p.x;
        root.position.z = p.z;
        yaw = Math.atan2(dx, dz);
      } else {
        moved = 0;
        replan = Math.min(replan, 0.2);
      }
    }
    const looking = activeBench !== null ? CHAMBERS[activeBench].bench : player;
    const look = Math.atan2(
      looking.x - root.position.x,
      looking.z - root.position.z,
    );
    if (!moved) yaw = look;
    const angle = (a: number, b: number) =>
      Math.atan2(Math.sin(a - b), Math.cos(a - b));
    root.rotation.y = reduced
      ? yaw
      : root.rotation.y + angle(yaw, root.rotation.y) * Math.min(1, dt * 5);
    head.rotation.y = THREE.MathUtils.clamp(
      angle(look, root.rotation.y),
      -0.8,
      0.8,
    );
    head.rotation.z = reduced
      ? 0
      : mood === "concern"
        ? 0.13
        : mood === "speak"
          ? Math.sin(clock * 3) * 0.035
          : Math.sin(clock * 0.8) * 0.018;
    const headHeight = head.getWorldPosition(new THREE.Vector3()).y + 0.075;
    const lookHeight = activeBench !== null ? BENCH_HEIGHT + 0.08 : 1.68;
    const pitch = THREE.MathUtils.clamp(
      -Math.atan2(
        lookHeight - headHeight,
        Math.hypot(looking.x - root.position.x, looking.z - root.position.z),
      ),
      -0.28,
      0.4,
    );
    head.rotation.x = reduced
      ? pitch
      : THREE.MathUtils.damp(head.rotation.x, pitch, 7, dt);
    const lean = moved > 0 ? 0.035 : Math.sin(clock * 1.5) * 0.006;
    body.rotation.x = reduced
      ? 0
      : THREE.MathUtils.damp(body.rotation.x, lean, 6, dt);
    // Keep the pointer stowed while travelling and during conversations.
    const pointing = activeBench !== null && moved === 0;
    const celebrating = mood === "celebrate" && activeBench === null;
    const blend = reduced ? 1 : 1 - Math.exp(-10 * dt);
    arm.quaternion.slerp(
      pointing ? shoulderPoint : celebrating ? shoulderCelebrate : shoulderRest,
      blend,
    );
    if (pointing) {
      const bench = CHAMBERS[activeBench].bench;
      localAim.copy(
        pointTarget ?? new THREE.Vector3(bench.x, BENCH_HEIGHT + 0.06, bench.z),
      );
      // Convert the actual world target through the moving shoulder before aiming.
      arm.updateWorldMatrix(true, false);
      arm.worldToLocal(localAim).sub(elbow.position).normalize();
      aimRotation.setFromUnitVectors(down, localAim);
      elbow.quaternion.slerp(aimRotation, blend);
    } else {
      elbow.quaternion.slerp(celebrating ? elbowRaised : elbowRest, blend);
    }
    wheel.rotation.x += moved / TANDEM_WHEEL_RADIUS;
    eye.emissiveIntensity =
      mood === "speak" && !reduced ? 0.85 + Math.sin(clock * 7) * 0.08 : 0.85;
    // Every requested active frame may change the guide pose, including an instant reduced-motion gesture.
    return true;
  }
  function focused(player: Player, obstacles: Obstacle[]) {
    if (!root.visible) return false;
    const p = position(),
      dx = p.x - player.x,
      dz = p.z - player.z,
      d = Math.hypot(dx, dz);
    return (
      d < 3.2 &&
      Math.abs(player.pitch) < 0.7 &&
      (-Math.sin(player.yaw) * dx - Math.cos(player.yaw) * dz) /
        Math.max(0.01, d) >
        0.91 &&
      clearGuidePath(player, p, obstacles)
    );
  }
  const travelling = () =>
    initialized &&
    Math.hypot(lastTarget.x - root.position.x, lastTarget.z - root.position.z) >
      0.2;
  return { root, position, update, reset, focused, travelling };
}
function positionNear(player: Player, obstacles: Obstacle[]): GuidePoint {
  for (let r = 1; r < 4; r += 0.5)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const p = {
        x: player.x + Math.cos(a) * r,
        z: player.z + Math.sin(a) * r,
      };
      if (canWalk(p.x, p.z, obstacles)) return p;
    }
  return { x: player.x, z: player.z };
}
