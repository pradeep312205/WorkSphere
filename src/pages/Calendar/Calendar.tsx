import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  X,
  Clock,
  MapPin,
} from "lucide-react";

import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";

import "./Calendar.css";
import { API_URL } from "../../lib/api";

/* =========================================================
   TYPES
========================================================= */

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
}

/* =========================================================
   HELPERS
========================================================= */

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekDays = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function formatDate(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDay(
  date1: Date,
  date2: Date
) {
  return (
    date1.getFullYear() ===
      date2.getFullYear() &&
    date1.getMonth() ===
      date2.getMonth() &&
    date1.getDate() ===
      date2.getDate()
  );
}

/* =========================================================
   CALENDAR
========================================================= */

function Calendar() {

  /* -------------------------------------------------------
     CURRENT DATE
  ------------------------------------------------------- */

  const today = new Date();


  /* -------------------------------------------------------
     CALENDAR MONTH
  ------------------------------------------------------- */

  const [currentDate, setCurrentDate] =
    useState(new Date());


  /* -------------------------------------------------------
     SELECTED DATE
  ------------------------------------------------------- */

  const [selectedDate, setSelectedDate] =
    useState<Date>(today);


  /* -------------------------------------------------------
     MODAL
  ------------------------------------------------------- */

  const [showModal, setShowModal] =
    useState(false);


  /* -------------------------------------------------------
     EVENTS
  ------------------------------------------------------- */

  const [events, setEvents] =
    useState<CalendarEvent[]>([]);

  const [loadingEvents, setLoadingEvents] =
    useState(true);


  /* -------------------------------------------------------
     FORM
  ------------------------------------------------------- */

  const [eventTitle, setEventTitle] =
    useState("");

  const [eventDate, setEventDate] =
    useState(formatDate(today));

  const [startTime, setStartTime] =
    useState("09:00");

  const [endTime, setEndTime] =
    useState("10:00");

  const [location, setLocation] =
    useState("");

  const [description, setDescription] =
    useState("");


  /* =======================================================
     LOAD EVENTS FROM BACKEND
  ======================================================= */

  useEffect(() => {
    fetchEvents();
  }, []);


  const fetchEvents = async () => {

    try {

      setLoadingEvents(true);

      const response = await fetch(
        `${API_URL}/calendar`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch calendar events"
        );
      }

      const data = await response.json();

      const formattedEvents: CalendarEvent[] =
        data.map((event: any) => ({
          id: event.id,

          title: event.title,

          date: String(
            event.event_date
          ).substring(0, 10),

          startTime: event.start_time
            ? String(
                event.start_time
              ).substring(0, 5)
            : "",

          endTime: event.end_time
            ? String(
                event.end_time
              ).substring(0, 5)
            : "",

          location:
            event.location || "",

          description:
            event.description || "",
        }));

      setEvents(formattedEvents);

    } catch (error) {

      console.error(
        "Error loading calendar events:",
        error
      );

    } finally {

      setLoadingEvents(false);

    }

  };


  /* =======================================================
     CALENDAR DAYS
  ======================================================= */

  const calendarDays = useMemo(() => {

    const year =
      currentDate.getFullYear();

    const month =
      currentDate.getMonth();

    const firstDay =
      new Date(
        year,
        month,
        1
      ).getDay();

    const daysInMonth =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const previousMonthDays =
      new Date(
        year,
        month,
        0
      ).getDate();

    const days: {
      date: Date;
      currentMonth: boolean;
    }[] = [];


    /* Previous month */

    for (
      let i = firstDay - 1;
      i >= 0;
      i--
    ) {

      days.push({
        date: new Date(
          year,
          month - 1,
          previousMonthDays - i
        ),

        currentMonth: false,
      });

    }


    /* Current month */

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {

      days.push({
        date: new Date(
          year,
          month,
          day
        ),

        currentMonth: true,
      });

    }


    /* Next month */

    let nextDay = 1;

    while (days.length < 42) {

      days.push({
        date: new Date(
          year,
          month + 1,
          nextDay
        ),

        currentMonth: false,
      });

      nextDay++;

    }

    return days;

  }, [currentDate]);


  /* =======================================================
     MONTH NAVIGATION
  ======================================================= */

  const previousMonth = () => {

    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      )
    );

  };


  const nextMonth = () => {

    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      )
    );

  };


  const goToToday = () => {

    setCurrentDate(
      new Date()
    );

    setSelectedDate(
      new Date()
    );

  };


  /* =======================================================
     OPEN ADD EVENT
  ======================================================= */

  const openAddEvent = (
    date?: Date
  ) => {

    const selected =
      date || selectedDate;

    setEventTitle("");

    setEventDate(
      formatDate(selected)
    );

    setStartTime("09:00");

    setEndTime("10:00");

    setLocation("");

    setDescription("");

    setShowModal(true);

  };


  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeModal = () => {

    setShowModal(false);

  };


  /* =======================================================
     ADD EVENT - BACKEND
  ======================================================= */

  const addEvent = async () => {

    if (!eventTitle.trim()) {

      alert(
        "Please enter an event title."
      );

      return;
    }


    try {

      const response = await fetch(
        `${API_URL}/calendar`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title:
              eventTitle.trim(),

            date:
              eventDate,

            startTime:
              startTime || null,

            endTime:
              endTime || null,

            location:
              location.trim(),

            description:
              description.trim(),
          }),
        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
            "Failed to create event"
        );

      }


      /*
        Reload events from MySQL
        after successful creation
      */

      await fetchEvents();


      setShowModal(false);


      /*
        Reset form
      */

      setEventTitle("");

      setLocation("");

      setDescription("");


    } catch (error) {

      console.error(
        "Error adding calendar event:",
        error
      );

      alert(
        "Failed to add event. Please make sure the backend server is running."
      );

    }

  };


  /* =======================================================
     EVENTS FOR DAY
  ======================================================= */

  const getEventsForDate = (
    date: Date
  ) => {

    const dateString =
      formatDate(date);

    return events.filter(
      (event) =>
        event.date === dateString
    );

  };


  /* =======================================================
     DELETE EVENT - BACKEND
  ======================================================= */

  const deleteEvent = async (
    eventId: number
  ) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this event?"
      );

    if (!confirmDelete) {
      return;
    }


    try {

      const response =
        await fetch(
          `${API_URL}/calendar/${eventId}`,
          {
            method: "DELETE",
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
            "Failed to delete event"
        );

      }


      /*
        Remove from UI
      */

      setEvents(
        (previous) =>
          previous.filter(
            (event) =>
              event.id !== eventId
          )
      );


    } catch (error) {

      console.error(
        "Error deleting event:",
        error
      );

      alert(
        "Failed to delete event."
      );

    }

  };


  /* =======================================================
     JSX
  ======================================================= */

  return (
    <div className="app-layout">

      <Navbar />

      <div className="app-body">

        <Sidebar />

        <main className="app-main">

          <div className="calendar-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="calendar-header">

              <div className="calendar-title">

                <div className="calendar-title-icon">

                  <CalendarDays
                    size={22}
                  />

                </div>

                <div>

                  <h1>
                    Calendar
                  </h1>

                  <p>
                    Manage your events
                    and schedule.
                  </p>

                </div>

              </div>


              <button
                className="calendar-add-button"
                onClick={() =>
                  openAddEvent()
                }
              >

                <Plus size={17} />

                Add event

              </button>

            </div>


            {/* =================================================
                CALENDAR CARD
            ================================================= */}

            <div className="calendar-card">


              {/* -------------------------------------------------
                  CALENDAR TOOLBAR
              ------------------------------------------------- */}

              <div className="calendar-toolbar">

                <div className="calendar-navigation">

                  <button
                    className="calendar-nav-button"
                    onClick={
                      previousMonth
                    }
                    title="Previous month"
                  >

                    <ChevronLeft
                      size={18}
                    />

                  </button>


                  <h2>

                    {monthNames[
                      currentDate.getMonth()
                    ]}{" "}

                    {currentDate.getFullYear()}

                  </h2>


                  <button
                    className="calendar-nav-button"
                    onClick={
                      nextMonth
                    }
                    title="Next month"
                  >

                    <ChevronRight
                      size={18}
                    />

                  </button>

                </div>


                <button
                  className="calendar-today-button"
                  onClick={
                    goToToday
                  }
                >
                  Today
                </button>

              </div>


              {/* -------------------------------------------------
                  WEEK DAYS
              ------------------------------------------------- */}

              <div className="calendar-weekdays">

                {weekDays.map(
                  (day) => (

                    <div
                      key={day}
                      className="calendar-weekday"
                    >
                      {day}
                    </div>

                  )
                )}

              </div>


              {/* -------------------------------------------------
                  DAYS
              ------------------------------------------------- */}

              <div className="calendar-grid">

                {calendarDays.map(
                  ({
                    date,
                    currentMonth,
                  }) => {

                    const dayEvents =
                      getEventsForDate(
                        date
                      );

                    const todayClass =
                      isSameDay(
                        date,
                        today
                      )
                        ? " today"
                        : "";

                    const selectedClass =
                      isSameDay(
                        date,
                        selectedDate
                      )
                        ? " selected"
                        : "";

                    const otherMonthClass =
                      currentMonth
                        ? ""
                        : " other-month";


                    return (

                      <div
                        key={formatDate(date)}
                        className={
                          "calendar-day" +
                          todayClass +
                          selectedClass +
                          otherMonthClass
                        }
                        onClick={() => {

                          setSelectedDate(
                            date
                          );

                        }}
                      >

                        <div className="calendar-day-header">

                          <span className="calendar-day-number">

                            {date.getDate()}

                          </span>


                          <button
                            className="calendar-day-add"
                            onClick={(e) => {

                              e.stopPropagation();

                              openAddEvent(
                                date
                              );

                            }}
                            title="Add event"
                          >

                            <Plus
                              size={14}
                            />

                          </button>

                        </div>


                        <div className="calendar-events">

                          {dayEvents.map(
                            (event) => (

                              <div
                                key={event.id}
                                className="calendar-event"
                                onClick={(e) =>
                                  e.stopPropagation()
                                }
                              >

                                <span>
                                  {event.startTime}
                                </span>

                                <strong>
                                  {event.title}
                                </strong>


                                <button
                                  className="calendar-event-delete"
                                  onClick={() =>
                                    deleteEvent(
                                      event.id
                                    )
                                  }
                                  title="Delete event"
                                >
                                  ×
                                </button>

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    );

                  }
                )}

              </div>

            </div>


            {/* =================================================
                SELECTED DAY
            ================================================= */}

            <div className="calendar-selected-day">

              <div className="selected-day-header">

                <div>

                  <h2>
                    {selectedDate.toLocaleDateString(
                      "en-US",
                      {
                        weekday:
                          "long",

                        month:
                          "long",

                        day:
                          "numeric",

                        year:
                          "numeric",
                      }
                    )}
                  </h2>

                  <p>
                    {getEventsForDate(
                      selectedDate
                    ).length}{" "}

                    event
                    {getEventsForDate(
                      selectedDate
                    ).length !== 1
                      ? "s"
                      : ""}

                  </p>

                </div>


                <button
                  className="calendar-small-add"
                  onClick={() =>
                    openAddEvent(
                      selectedDate
                    )
                  }
                >

                  <Plus size={15} />

                  Add event

                </button>

              </div>


              {/* Selected events */}

              {loadingEvents ? (

                <div className="calendar-no-events">

                  <CalendarDays
                    size={28}
                  />

                  <h3>
                    Loading events...
                  </h3>

                </div>

              ) : getEventsForDate(
                selectedDate
              ).length === 0 ? (

                <div className="calendar-no-events">

                  <CalendarDays
                    size={28}
                  />

                  <h3>
                    No events
                  </h3>

                  <p>
                    You don't have any
                    events scheduled
                    for this day.
                  </p>

                </div>

              ) : (

                <div className="selected-events">

                  {getEventsForDate(
                    selectedDate
                  ).map(
                    (event) => (

                      <div
                        className="selected-event-card"
                        key={event.id}
                      >

                        <div className="selected-event-main">

                          <h3>
                            {event.title}
                          </h3>

                          {event.description && (
                            <p>
                              {event.description}
                            </p>
                          )}

                        </div>


                        <div className="selected-event-details">

                          <span>

                            <Clock
                              size={15}
                            />

                            {event.startTime}
                            {" - "}
                            {event.endTime}

                          </span>


                          {event.location && (

                            <span>

                              <MapPin
                                size={15}
                              />

                              {event.location}

                            </span>

                          )}

                        </div>


                        <button
                          className="selected-event-delete"
                          onClick={() =>
                            deleteEvent(
                              event.id
                            )
                          }
                        >

                          <TrashIcon />

                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        </main>

      </div>


      {/* =====================================================
          ADD EVENT MODAL
      ===================================================== */}

      {showModal && (

        <div
          className="calendar-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="calendar-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >


            {/* Modal header */}

            <div className="calendar-modal-header">

              <div>

                <h2>
                  Add event
                </h2>

                <p>
                  Create a new calendar event.
                </p>

              </div>


              <button
                className="calendar-modal-close"
                onClick={
                  closeModal
                }
              >

                <X size={19} />

              </button>

            </div>


            {/* Title */}

            <div className="calendar-form-group">

              <label>
                Event title
              </label>

              <input
                type="text"
                value={eventTitle}
                onChange={(e) =>
                  setEventTitle(
                    e.target.value
                  )
                }
                placeholder="Enter event title"
              />

            </div>


            {/* Date */}

            <div className="calendar-form-group">

              <label>
                Date
              </label>

              <input
                type="date"
                value={eventDate}
                onChange={(e) =>
                  setEventDate(
                    e.target.value
                  )
                }
              />

            </div>


            {/* Time */}

            <div className="calendar-form-row">

              <div className="calendar-form-group">

                <label>
                  Start time
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(e) =>
                    setStartTime(
                      e.target.value
                    )
                  }
                />

              </div>


              <div className="calendar-form-group">

                <label>
                  End time
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) =>
                    setEndTime(
                      e.target.value
                    )
                  }
                />

              </div>

            </div>


            {/* Location */}

            <div className="calendar-form-group">

              <label>
                Location
              </label>

              <input
                type="text"
                value={location}
                onChange={(e) =>
                  setLocation(
                    e.target.value
                  )
                }
                placeholder="Enter location"
              />

            </div>


            {/* Description */}

            <div className="calendar-form-group">

              <label>
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Add a description..."
                rows={3}
              />

            </div>


            {/* Modal actions */}

            <div className="calendar-modal-actions">

              <button
                className="calendar-cancel-button"
                onClick={
                  closeModal
                }
              >
                Cancel
              </button>


              <button
                className="calendar-save-button"
                onClick={
                  addEvent
                }
              >

                <Plus size={16} />

                Add event

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


/* =========================================================
   SMALL TRASH ICON
========================================================= */

function TrashIcon() {

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >

      <path d="M3 6h18" />

      <path d="M8 6V4h8v2" />

      <path d="M19 6l-1 14H6L5 6" />

      <path d="M10 11v5" />

      <path d="M14 11v5" />

    </svg>
  );

}


export default Calendar;
