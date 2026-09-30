from app.services.gemini_service import analyze_complaint


test_complaints = [
    {
        "text": "हमारे इलाके में सड़क पर बहुत बड़े गड्ढे हैं और बारिश में पानी भर जाता है।",
        "language": "hindi",
    },
    {
        "text": "आमच्या परिसरातील रस्त्यावरील दिवे गेल्या दोन महिन्यांपासून बंद आहेत.",
        "language": "marathi",
    },
    {
        "text": "There is garbage piling up near the school and it has not been collected for several days.",
        "language": "english",
    },
]


for complaint in test_complaints:
    print("\n" + "=" * 60)

    print("INPUT:")
    print(complaint["text"])

    result = analyze_complaint(
        text=complaint["text"],
        language=complaint["language"],
    )

    print("\nAI ANALYSIS:")
    print(result.model_dump_json(indent=2))