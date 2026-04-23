def background_worker():
    import pytz
    import requests

    already_settled_today = False

    while True:
        try:
            eastern = pytz.timezone("US/Eastern")
            est_now = datetime.now(eastern)

            hour = est_now.hour
            minute = est_now.minute
            is_weekday = est_now.weekday() < 5

            # 🔥 4:00–4:09 PM EST trigger window
            is_close_time = is_weekday and hour == 16 and minute < 10

            if is_close_time and not already_settled_today:
                print(f"[AUTO-SETTLE] Trigger window hit at {est_now}")

                try:
                    res = requests.post(
                        "https://priceband-backend.onrender.com/api/auto-settle",
                        timeout=20
                    )

                    print(f"[AUTO-SETTLE] Response: {res.status_code} {res.text}")

                    # 🔥 Only mark settled if it actually worked
                    if res.status_code == 200:
                        already_settled_today = True

                except Exception as e:
                    print(f"[AUTO-SETTLE ERROR] {e}")

            # 🔁 Reset before next day
            if hour < 15:
                already_settled_today = False

            # 📝 Log once per minute
            if est_now.second < 10:
                print(f"[WORKER] {est_now.strftime('%H:%M:%S')} | settled_today={already_settled_today}")

        except Exception as e:
            print(f"[WORKER CRASH] {e}")

        time.sleep(10)
