/** モック用データ（仕様書のテーブル・画面に対応） */
window.MOCK = {
  stations: [
    { id: 1, name: "名古屋駅", is_active: true },
    { id: 2, name: "岐阜駅", is_active: true },
    { id: 3, name: "廃止予定駅", is_active: false },
  ],
  users: [
    { id: 1, username: "admin", role: "admin", station_id: null },
    { id: 2, username: "operator_nagoya", role: "operator", station_id: 1 },
    { id: 3, username: "operator_gifu", role: "operator", station_id: 2 },
  ],
  broadcasts: [
    {
      id: 1,
      station_id: null,
      title: "輸送障害時のHP案内（全駅共通）",
      text_ja:
        "ご案内いたします。現在、東海道線において一部の列車に遅れが生じております。詳しくはJR東海のホームページをご確認ください。",
      text_en:
        "Due to transportation disruptions, train services are delayed. We apologize for the inconvenience. Please check the latest service updates.",
      text_ko:
        "수송 장애로 인해 열차 운행에 지연이 발생하고 있습니다. 이용 고객 여러분께 불편을 드려 죄송합니다. 최신 운행 정보를 확인해 주십시오.",
      text_zh:
        "由于运输障碍，列车运行出现延误。给您带来不便，深表歉意。请查看最新的运行信息。",
      audio_ja: "audio/transport-ja.mp3",
      audio_en: "audio/transport-en.mp3",
      audio_ko: "audio/transport-ko.mp3",
      audio_zh: "audio/transport-zh.mp3",
      is_deleted: false,
    },
    {
      id: 2,
      station_id: null,
      title: "歩きスマホマナー案内（全駅共通）",
      text_ja:
        "ホームや階段での歩きスマホは大変危険ですのでおやめください。お客様ご自身だけでなく、周りのお客様のご迷惑にもなりますので、ご協力をお願いいたします。",
      text_en:
        "Using smartphones while walking on platforms or stairs is extremely dangerous. Please refrain from doing so for your own safety and to avoid inconveniencing other passengers. We appreciate your cooperation.",
      text_ko:
        "승강장이나 계단에서 스마트폰을 보며 걷는 행위는 매우 위험하오니 삼가 주십시오. 고객 여러분 본인뿐만 아니라 주변 승객분들께도 큰 피해가 될 수 있으니 협조 부탁드립니다.",
      text_zh:
        "在月台或楼梯上边走路边看手机非常危险，请不要这样做。这不仅关系到您自身的安全，也会给周围的乘客带来困扰，敬请配合。",
      audio_ja: "audio/manner-ja.mp3",
      audio_en: "audio/manner-en.mp3",
      audio_ko: "audio/manner-ko.mp3",
      audio_zh: "audio/manner-zh.mp3",
      is_deleted: false,
    },
    {
      id: 3,
      station_id: null,
      title: "（削除済み）",
      text_ja: "（旧）臨時のご案内",
      text_en: null,
      text_ko: null,
      text_zh: null,
      is_deleted: true,
    },
  ],
  favorites: [
    { station_id: 1, broadcast_id: 1, sort_order: 0 },
    { station_id: 1, broadcast_id: 2, sort_order: 1 },
    { station_id: 2, broadcast_id: 1, sort_order: 0 },
  ],
  schedules: [
    {
      id: 1,
      station_id: 1,
      broadcast_id: 1,
      languages: "ja,en,ko,zh",
      schedule_type: "weekly",
      once_at: null,
      days_of_week: "mon,wed,fri",
      time_of_day: "09:00",
      interval_min: null,
      start_date: "2026-04-01",
      end_date: "2026-12-31",
      is_active: true,
    },
    {
      id: 2,
      station_id: 2,
      broadcast_id: 1,
      schedule_type: "interval",
      time_of_day: "08:00",
      interval_min: 60,
      start_date: "2026-03-01",
      end_date: null,
      is_active: true,
    },
    {
      id: 3,
      station_id: 1,
      broadcast_id: 2,
      schedule_type: "once",
      once_at: "2026-04-15T10:30:00+09:00",
      is_active: false,
    },
  ],
  logs: [
    {
      id: 1,
      station_id: 1,
      broadcast_id: 1,
      schedule_id: 1,
      played_at: "2026-03-26T09:00:05+09:00",
      status: "success",
    },
    {
      id: 2,
      station_id: 1,
      broadcast_id: 3,
      schedule_id: null,
      played_at: "2026-03-25T18:12:00+09:00",
      status: "success",
    },
    {
      id: 3,
      station_id: 2,
      broadcast_id: 1,
      schedule_id: 2,
      played_at: "2026-03-26T08:00:00+09:00",
      status: "missed",
    },
  ],
};
