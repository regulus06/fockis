import { useEffect, useMemo, useState } from "react";

import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getPrograms,
  getAcademyUsers,
  AcademyApiError,
  CourseInput,
  CourseModuleInput,
  AcademyUser,
  AcademyProgram,
} from "../../../lib/academyApi";

import AdminTable, {
  AdminColumn,
} from "../../../components/academy/admin/AdminTable";

import AdminModal from "../../../components/academy/admin/AdminModal";

import AdminConfirmDialog from "../../../components/academy/admin/AdminConfirmDialog";

import { useAcademyToast } from "../../../lib/academyToastStore";

interface CourseInstructor {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  role?: string;
}

interface CourseRow {
  _id: string;
  code: string;
  name: string;
  instructor: string;
  instructorId?: string;
  instructorUser?: CourseInstructor | null;
  description?: string;
  programId?: string;
  modules: CourseModuleInput[];
}

const EMPTY_FORM: CourseInput = {
  code: "",
  name: "",
  instructor: "",
  instructorId: undefined,
  description: "",
  programId: undefined,
  modules: [],
};

export default function AcademyAdminCourses() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [programs, setPrograms] = useState<AcademyProgram[]>([]);
  const [instructors, setInstructors] =
    useState<AcademyUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] =
    useState<CourseRow | null>(null);

  const [form, setForm] =
    useState<CourseInput>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] =
    useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<CourseRow | null>(null);

  const [deleting, setDeleting] = useState(false);

  const showToast = useAcademyToast(
    (state) => state.showToast,
  );

  async function load() {
    setLoading(true);
    setError(false);

    try {
      const data = await getCourses();

      setCourses(
        Array.isArray(data)
          ? (data as CourseRow[])
          : [],
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadFormData() {
    try {
      const [programData, userData] =
        await Promise.all([
          getPrograms(),
          getAcademyUsers(),
        ]);

      setPrograms(programData);

      setInstructors(
        userData.filter(
          (user) => user.role === "instructor",
        ),
      );
    } catch {
      setPrograms([]);
      setInstructors([]);
    }
  }

  useEffect(() => {
    void load();
    void loadFormData();
  }, []);

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return courses;
    }

    return courses.filter((course) =>
      [
        course.code,
        course.name,
        course.instructor,
      ]
        .filter(Boolean)
        .some((value) =>
          value
            .toLowerCase()
            .includes(query),
        ),
    );
  }, [courses, search]);

  function openCreate() {
    setEditing(null);

    setForm({
      ...EMPTY_FORM,
      modules: [],
    });

    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(course: CourseRow) {
    setEditing(course);

    setForm({
      code: course.code,
      name: course.name,
      instructor: course.instructor ?? "",
      instructorId:
        course.instructorId ??
        course.instructorUser?._id ??
        course.instructorUser?.id,
      description:
        course.description ?? "",
      programId: course.programId,
      modules: Array.isArray(course.modules)
        ? course.modules.map((module) => ({
            order: module.order,
            title: module.title,
          }))
        : [],
    });

    setFormError(null);
    setModalOpen(true);
  }

  function updateField<K extends keyof CourseInput>(
    field: K,
    value: CourseInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleInstructorChange(
    instructorId: string,
  ) {
    const instructor =
      instructors.find(
        (user) =>
          user.id === instructorId ||
          user._id === instructorId,
      );

    setForm((current) => ({
      ...current,
      instructorId:
        instructorId || undefined,
      instructor:
        instructor?.name ?? "",
    }));
  }

  function updateModuleRow(
    index: number,
    field: keyof CourseModuleInput,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      modules: (current.modules ?? []).map(
        (module, moduleIndex) =>
          moduleIndex === index
            ? {
                ...module,
                [field]:
                  field === "order"
                    ? Number(value)
                    : value,
              }
            : module,
      ),
    }));
  }

  function addModuleRow() {
    setForm((current) => {
      const modules =
        current.modules ?? [];

      const nextOrder =
        modules.length > 0
          ? Math.max(
              ...modules.map(
                (module) => module.order,
              ),
            ) + 1
          : 1;

      return {
        ...current,
        modules: [
          ...modules,
          {
            order: nextOrder,
            title: "",
          },
        ],
      };
    });
  }

  function removeModuleRow(index: number) {
    setForm((current) => ({
      ...current,
      modules: (current.modules ?? []).filter(
        (_, moduleIndex) =>
          moduleIndex !== index,
      ),
    }));
  }

  async function handleSave() {
    const code =
      form.code.trim().toUpperCase();

    const name = form.name.trim();

    if (!code) {
      setFormError(
        "Course code is required.",
      );
      return;
    }

    if (!name) {
      setFormError(
        "Course name is required.",
      );
      return;
    }

    if (!form.instructorId) {
      setFormError(
        "Please select an instructor.",
      );
      return;
    }

    const invalidModule =
      (form.modules ?? []).some(
        (module) =>
          !module.title.trim() ||
          !Number.isInteger(module.order) ||
          module.order < 1,
      );

    if (invalidModule) {
      setFormError(
        "Every module needs a valid order and title.",
      );
      return;
    }

    const moduleOrders =
      (form.modules ?? []).map(
        (module) => module.order,
      );

    if (
      new Set(moduleOrders).size !==
      moduleOrders.length
    ) {
      setFormError(
        "Module order numbers must be unique.",
      );
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload: CourseInput = {
      code,
      name,
      instructor:
        form.instructor.trim(),
      instructorId:
        form.instructorId,
      description:
        form.description?.trim() || "",
      programId:
        form.programId || undefined,
      modules: (form.modules ?? [])
        .map((module) => ({
          order: module.order,
          title: module.title.trim(),
        }))
        .sort(
          (a, b) => a.order - b.order,
        ),
    };

    try {
      if (editing) {
        await updateCourse(
          editing.code,
          payload,
        );

        showToast("Course updated.");
      } else {
        await createCourse(payload);

        showToast("Course created.");
      }

      setModalOpen(false);
      setEditing(null);

      await load();
    } catch (err: unknown) {
      setFormError(
        err instanceof AcademyApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save course.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      await deleteCourse(
        deleteTarget.code,
      );

      showToast("Course deleted.");

      setDeleteTarget(null);

      await load();
    } catch (err: unknown) {
      showToast(
        err instanceof AcademyApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to delete course.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const columns: AdminColumn<CourseRow>[] =
    [
      {
        key: "code",
        label: "Code",
        render: (course) => (
          <span className="mono">
            {course.code}
          </span>
        ),
      },
      {
        key: "name",
        label: "Course",
        render: (course) => (
          <strong>{course.name}</strong>
        ),
      },
      {
        key: "instructor",
        label: "Instructor",
        render: (course) =>
          course.instructor ||
          course.instructorUser?.name ||
          "—",
      },
      {
        key: "modules",
        label: "Modules",
        render: (course) =>
          course.modules?.length ?? 0,
      },
    ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Courses (LMS)</h1>

          <p>
            Manage courses and the modules
            that make up Fockis Learn.
          </p>
        </div>

        <button
          className="btn btn-gold btn-sm"
          onClick={openCreate}
        >
          + Add Course
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <input
            placeholder="Search courses…"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={filtered}
        rowKey={(course) =>
          course._id ?? course.code
        }
        loading={loading}
        error={error}
        emptyMessage={
          search
            ? "No courses match your search."
            : "No courses yet — add your first one."
        }
        onRetry={load}
        renderActions={(course) => (
          <>
            <button
              className="admin-icon-btn"
              onClick={() =>
                openEdit(course)
              }
            >
              Edit
            </button>

            <button
              className="admin-icon-btn danger"
              onClick={() =>
                setDeleteTarget(course)
              }
            >
              Delete
            </button>
          </>
        )}
      />

      <AdminModal
        open={modalOpen}
        title={
          editing
            ? "Edit Course"
            : "Add Course"
        }
        onClose={() =>
          !saving &&
          setModalOpen(false)
        }
      >
        {formError && (
          <div className="admin-login-error">
            {formError}
          </div>
        )}

        <div className="form-grid">
          <div className="field">
            <label>Code</label>

            <input
              value={form.code}
              disabled={!!editing}
              placeholder="CYBER 101"
              onChange={(event) =>
                updateField(
                  "code",
                  event.target.value,
                )
              }
            />
          </div>

          <div className="field">
            <label>Name</label>

            <input
              value={form.name}
              placeholder="Introduction to Cybersecurity"
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value,
                )
              }
            />
          </div>

          <div className="field">
            <label>Instructor</label>

            <select
              value={
                form.instructorId ?? ""
              }
              onChange={(event) =>
                handleInstructorChange(
                  event.target.value,
                )
              }
            >
              <option value="">
                — Select Instructor —
              </option>

              {instructors.map((user) => {
                const userId =
                  user.id ?? user._id ?? "";

                return (
                  <option
                    key={userId}
                    value={userId}
                  >
                    {user.name}
                    {user.email
                      ? ` — ${user.email}`
                      : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="field">
            <label>
              Program (optional)
            </label>

            <select
              value={
                form.programId ?? ""
              }
              onChange={(event) =>
                updateField(
                  "programId",
                  event.target.value ||
                    undefined,
                )
              }
            >
              <option value="">
                — None —
              </option>

              {programs.map((program) => {
                const programId =
                  program._id ??
                  program.id ??
                  "";

                return (
                  <option
                    key={programId}
                    value={programId}
                  >
                    {program.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="field full">
            <label>Description</label>

            <textarea
              rows={3}
              value={
                form.description ?? ""
              }
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value,
                )
              }
            />
          </div>
        </div>

        <h3
          style={{
            fontSize: 14,
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          Modules
        </h3>

        {(form.modules ?? []).map(
          (module, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "0.5fr 3fr auto",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <input
                type="number"
                min={1}
                value={module.order}
                onChange={(event) =>
                  updateModuleRow(
                    index,
                    "order",
                    event.target.value,
                  )
                }
              />

              <input
                placeholder="Module title"
                value={module.title}
                onChange={(event) =>
                  updateModuleRow(
                    index,
                    "title",
                    event.target.value,
                  )
                }
              />

              <button
                className="admin-icon-btn danger"
                type="button"
                onClick={() =>
                  removeModuleRow(index)
                }
              >
                ✕
              </button>
            </div>
          ),
        )}

        <button
          className="btn btn-outline btn-sm"
          type="button"
          onClick={addModuleRow}
        >
          + Add Module
        </button>

        <div className="admin-modal-actions">
          <button
            className="btn btn-outline btn-sm"
            disabled={saving}
            onClick={() =>
              setModalOpen(false)
            }
          >
            Cancel
          </button>

          <button
            className="btn btn-gold btn-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : editing
                ? "Save Changes"
                : "Create Course"}
          </button>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={!!deleteTarget}
        title="Delete Course"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? All enrollments for this course will also be removed. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() =>
          !deleting &&
          setDeleteTarget(null)
        }
      />
    </div>
  );
}