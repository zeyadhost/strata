import { execSync } from "node:child_process";
import process from "node:process";

const ports = [3000, 5173];

function getListeningPidsWindows(port) {
  const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts[1]?.endsWith(`:${port}`) && parts[3] === "LISTENING")
    .map((parts) => Number(parts[4]))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function getListeningPidsUnix(port) {
  const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return output
    .split(/\r?\n/)
    .map((value) => Number(value.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function getListeningPids(port) {
  try {
    if (process.platform === "win32") return getListeningPidsWindows(port);
    return getListeningPidsUnix(port);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      return;
    }

    process.kill(pid, "SIGTERM");
  } catch {
  }
}

for (const port of ports) {
  const pids = getListeningPids(port);
  for (const pid of pids) killPid(pid);
}
