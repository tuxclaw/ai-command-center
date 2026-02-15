use serde::Serialize;
use sysinfo::{Disks, System};

#[derive(Debug, Serialize)]
pub struct SystemStats {
    pub cpu_percent: f32,
    pub ram_total: u64,
    pub ram_used: u64,
    pub ram_percent: f32,
    pub disk_total: u64,
    pub disk_used: u64,
    pub disk_percent: f32,
    pub uptime: u64,
    pub ollama_status: String,
}

#[tauri::command]
pub async fn get_system_stats() -> Result<SystemStats, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    // Need a brief delay then refresh for accurate CPU
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_all();

    let cpu_percent = sys.global_cpu_usage();
    let ram_total = sys.total_memory();
    let ram_used = sys.used_memory();
    let ram_percent = if ram_total > 0 {
        (ram_used as f32 / ram_total as f32) * 100.0
    } else {
        0.0
    };

    let disks = Disks::new_with_refreshed_list();
    let (disk_total, disk_used) = disks.iter().fold((0u64, 0u64), |(t, u), d| {
        (t + d.total_space(), u + (d.total_space() - d.available_space()))
    });
    let disk_percent = if disk_total > 0 {
        (disk_used as f32 / disk_total as f32) * 100.0
    } else {
        0.0
    };

    let uptime = System::uptime();

    // Check Ollama status
    let ollama_status = match reqwest::get("http://localhost:11434/api/tags").await {
        Ok(r) if r.status().is_success() => "online".to_string(),
        _ => "offline".to_string(),
    };

    Ok(SystemStats {
        cpu_percent,
        ram_total,
        ram_used,
        ram_percent,
        disk_total,
        disk_used,
        disk_percent,
        uptime,
        ollama_status,
    })
}
